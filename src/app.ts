import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";

type Borough = "Queens" | "Manhattan" | "Brooklyn" | "New York Harbor";
type Category = "Incontournable" | "Musée" | "Parc" | "Quartier" | "Pause" | "Transport";
type Filter = "Tous" | Borough | "Incontournables" | "Musées" | "Quartiers";

type MapPoint = {
  label: string;
  lat: number;
  lng: number;
};

type PianoMapPoint = {
  number: number;
  title: string;
  site: string;
  lat: number;
  lng: number;
};

type Site = {
  id: string;
  title: string;
  image: string;
  imageQuery?: string;
  description: string;
  tip: string;
  borough: Borough;
  category: Category;
  duration: string;
  map?: MapPoint;
};

type DayPlan = {
  id: string;
  date: string;
  title: string;
  image: string;
  imageQuery?: string;
  summary: string;
  route: string;
  siteIds: string[];
  layout?: "full" | "two";
};

type CommonsImage = {
  title: string;
  thumbUrl: string;
  originalUrl: string;
  descriptionUrl: string;
};

type CommonsImageCache = Record<
  string,
  {
    fetchedAt: number;
    images: CommonsImage[];
  }
>;

type ParentInterestPick = {
  papa: string;
  maman: string;
};

type SecretCuriosity = {
  title: string;
  text: string;
};

type TeenInterestPick = {
  text: string;
};

type MusicVenuePick = {
  text: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type CommonsApiImageInfo = {
  thumburl?: string;
  url?: string;
  descriptionurl?: string;
  mime?: string;
  mediatype?: string;
  extmetadata?: {
    Artist?: { value?: string };
    LicenseShortName?: { value?: string };
  };
};

type CommonsApiResponse = {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        imageinfo?: CommonsApiImageInfo[];
      }
    >;
  };
};

const heroImage =
  "https://commons.wikimedia.org/wiki/Special:FilePath/Manhattan_Skyline_from_Brooklyn_Bridge_Park_November_2021.jpg";
const heroImageQuery = "Manhattan skyline Brooklyn Bridge Park New York City";
const commonsApiUrl = "https://commons.wikimedia.org/w/api.php";
const commonsCacheKey = "nyc-2026-commons-image-cache-v8";
const commonsCacheMaxAgeMs = 1000 * 60 * 60 * 24 * 14;

const sites: Site[] = [
  {
    id: "hotel",
    title: "Wingate by Wyndham Long Island City",
    image:
      "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1c/b5/46/53/exterior.jpg?w=1200&h=800&s=1",
    imageQuery: "Wingate by Wyndham Long Island City 38-70 12th Street",
    description:
      "Votre base familiale à Long Island City : Wingate by Wyndham Long Island City, 38-70 12th Street, Queens, NY 11101.",
    tip: "Gardez cette fiche comme point de repère : adresse prête pour taxi/VTC, retour en métro à vérifier selon la ligne et départ aéroport depuis l'hôtel.",
    borough: "Queens",
    category: "Transport",
    duration: "Base séjour",
    map: { label: "🏨", lat: 40.7567, lng: -73.9427 },
  },
  {
    id: "fireworks",
    title: "Feu d'artifice du 4 juillet",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Macy%27s_4th_of_July_Fireworks_2011_-_New_York_City.jpg",
    description:
      "À voir seulement si tout le monde garde de l'énergie après l'arrivée. La foule est très importante autour des grands points de vue.",
    tip: "Le soir de l'arrivée, ne viser le feu d'artifice que si le lieu officiel 2026 et l'énergie familiale le permettent.",
    borough: "Manhattan",
    category: "Incontournable",
    duration: "Option soirée",
  },
  {
    id: "gantry",
    title: "Gantry Plaza State Park",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Gantry_Plaza_State_Park_2012.jpg",
    description:
      "Vue magnifique sur la skyline depuis Long Island City, très proche de l'hôtel et facile à refaire plusieurs fois.",
    tip: "Très pratique depuis Long Island City : parfait pour une sortie courte au coucher du soleil ou une pause sans traverser Manhattan.",
    borough: "Queens",
    category: "Parc",
    duration: "45 min",
    map: { label: "0", lat: 40.7476, lng: -73.957 },
  },
  {
    id: "times-square",
    title: "Times Square",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/1_times_square_night_2013.jpg",
    description:
      "Le New York lumineux et spectaculaire : écrans géants, magasins, ambiance permanente. Idéal pour le premier contact avec Manhattan.",
    tip: "Passage court conseillé : fin d'après-midi ou soirée pour les lumières, mais éviter d'y rester longtemps si la foule fatigue les enfants.",
    borough: "Manhattan",
    category: "Incontournable",
    duration: "45 min",
    map: { label: "1", lat: 40.758, lng: -73.9855 },
  },
  {
    id: "bryant",
    title: "Bryant Park",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Bryant_Park_New_York_City.jpg",
    description:
      "Parc agréable derrière la bibliothèque, parfait pour une pause fraîcheur, un café ou quelques photos.",
    tip: "Bonne pause entre Times Square et la bibliothèque ; viser une table à l'ombre ou un passage court selon la chaleur.",
    borough: "Manhattan",
    category: "Pause",
    duration: "30 min",
  },
  {
    id: "library",
    title: "New York Public Library",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/New_York_Public_Library_-_Main_Branch.jpg",
    description:
      "Magnifique bâtiment Beaux-Arts, entrée impressionnante, lions iconiques et salles historiques.",
    tip: "Visite courte possible, mais vérifier les salles ouvertes si vous voulez voir la Rose Main Reading Room.",
    borough: "Manhattan",
    category: "Incontournable",
    duration: "45 min",
  },
  {
    id: "grand-central",
    title: "Grand Central Terminal",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Grand_Central_Terminal_Main_Concourse_Jan_2006.jpg",
    description:
      "Grande gare mythique avec plafond astronomique, architecture spectaculaire et Dining Concourse pratique.",
    tip: "Pause idéale si météo chaude ou pluie ; vérifier les horaires des commerces si vous comptez y manger.",
    borough: "Manhattan",
    category: "Transport",
    duration: "30 min",
    map: { label: "2", lat: 40.7527, lng: -73.9772 },
  },
  {
    id: "rockefeller",
    title: "Rockefeller Center",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Rockefeller_Center_New_York.jpg",
    description:
      "Complexe emblématique de Midtown : Channel Gardens, patinoire hors saison transformée, boutiques et animations.",
    tip: "À faire en passage entre la 5th Avenue, St. Patrick's Cathedral et Top of the Rock plutôt qu'en visite longue.",
    borough: "Manhattan",
    category: "Incontournable",
    duration: "30 min",
  },
  {
    id: "top-rock",
    title: "Top of the Rock",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Top_of_the_Rock_View.jpg",
    description:
      "Observatoire avec vue très lisible sur Central Park et l'Empire State Building. Bon choix en famille.",
    tip: "Réserver un créneau à l'avance ; le coucher du soleil est très demandé et plus fatigant avec les files.",
    borough: "Manhattan",
    category: "Incontournable",
    duration: "1 h 30",
    map: { label: "3", lat: 40.7591, lng: -73.9794 },
  },
  {
    id: "liberty",
    title: "Statue de la Liberté",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Statue_of_Liberty_7.jpg",
    description:
      "Symbole de New York et des États-Unis. Le ferry donne aussi de superbes vues sur Manhattan.",
    tip: "Réserver tôt via Statue City Cruises et éviter les sacs volumineux à cause des contrôles de sécurité.",
    borough: "New York Harbor",
    category: "Incontournable",
    duration: "2 h 30",
    map: { label: "11", lat: 40.6892, lng: -74.0445 },
  },
  {
    id: "ellis",
    title: "Ellis Island",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Ellis_Island_Main_Building.jpg",
    description:
      "Musée de l'immigration, émouvant et intéressant pour comprendre l'histoire des arrivées à New York.",
    tip: "Prévoir une visite sélective : Great Hall, exposition principale et audio-guide si les enfants accrochent.",
    borough: "New York Harbor",
    category: "Musée",
    duration: "1 h 15",
  },
  {
    id: "wall-street",
    title: "Wall Street",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/New_York_Stock_Exchange_Front.jpg",
    description:
      "Quartier financier : New York Stock Exchange, Federal Hall, rues étroites et ambiance business.",
    tip: "À garder court : rues étroites, beaucoup de monde en semaine, intérêt surtout photo et histoire.",
    borough: "Manhattan",
    category: "Quartier",
    duration: "30 min",
  },
  {
    id: "oculus",
    title: "Oculus",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Oculus_World_Trade_Center_Transportation_Hub.jpg",
    description:
      "Architecture blanche spectaculaire, centre commercial et gare sous le World Trade Center.",
    tip: "Bon refuge en cas de chaleur ou pluie, avec accès pratique aux transports et au centre commercial.",
    borough: "Manhattan",
    category: "Transport",
    duration: "30 min",
  },
  {
    id: "memorial911",
    title: "9/11 Memorial",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/National_September_11_Memorial_%26_Museum.jpg",
    description:
      "Lieu de mémoire sobre et impressionnant, avec les deux bassins à l'emplacement des tours.",
    tip: "Avec enfants/ados, expliquer le lieu avant d'arriver et garder le passage sobre et pas trop long.",
    borough: "Manhattan",
    category: "Incontournable",
    duration: "45 min",
    map: { label: "12", lat: 40.7115, lng: -74.0134 },
  },
  {
    id: "brooklyn-bridge",
    title: "Brooklyn Bridge",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Brooklyn_Bridge_Postdlf.jpg",
    description:
      "Traversée iconique à pied avec vues sur Manhattan, câbles et skyline.",
    tip: "Commencer côté Manhattan si vous voulez finir par DUMBO, en gardant eau et casquettes à portée.",
    borough: "Brooklyn",
    category: "Incontournable",
    duration: "1 h",
    map: { label: "13", lat: 40.7061, lng: -73.9969 },
  },
  {
    id: "dumbo",
    title: "DUMBO",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Manhattan_Bridge_from_Dumbo_Brooklyn.jpg",
    description:
      "Quartier photo incontournable, notamment Washington Street avec le Manhattan Bridge.",
    tip: "Très fréquenté autour de Washington Street : venir tôt ou accepter une photo rapide sans attendre la scène parfaite.",
    borough: "Brooklyn",
    category: "Quartier",
    duration: "1 h",
    map: { label: "14", lat: 40.7033, lng: -73.9881 },
  },
  {
    id: "carousel",
    title: "Jane's Carousel",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Janes_Carousel_Brooklyn.jpg",
    description:
      "Carrousel vintage sous verrière, au bord de l'East River. Même sans monter, le lieu est beau.",
    tip: "À combiner avec Brooklyn Bridge Park ; vérifier horaires si vous promettez un tour de carrousel.",
    borough: "Brooklyn",
    category: "Pause",
    duration: "20 min",
  },
  {
    id: "bbpark",
    title: "Brooklyn Bridge Park",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Brooklyn_Bridge_Park_Manhattan_Skyline.jpg",
    description:
      "Grand parc au bord de l'eau avec vues magnifiques sur Lower Manhattan.",
    tip: "Parfait pour repos, glace et skyline ; prévoir le retour avant que tout le monde soit épuisé.",
    borough: "Brooklyn",
    category: "Parc",
    duration: "1 h",
  },
  {
    id: "central-park",
    title: "Central Park",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Central_Park_New_York_City_New_York_23_crop.jpg",
    description:
      "Le grand bol d'air de Manhattan : lacs, pelouses, ponts, artistes de rue.",
    tip: "Ne pas vouloir tout faire : choisir une zone et garder de l'eau, surtout en juillet.",
    borough: "Manhattan",
    category: "Parc",
    duration: "2 h",
    map: { label: "4", lat: 40.7829, lng: -73.9654 },
  },
  {
    id: "bethesda",
    title: "Bethesda Terrace",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Bethesda_Terrace_and_Fountain,_Central_Park.jpg",
    description:
      "Un des plus beaux endroits de Central Park : fontaine, arcade, musiciens, vue sur le lac.",
    tip: "Très beau en milieu de matinée, mais rester flexible car la zone peut être très fréquentée.",
    borough: "Manhattan",
    category: "Parc",
    duration: "30 min",
  },
  {
    id: "amnh",
    title: "American Museum of Natural History",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/American_Museum_of_Natural_History_New_York_City.jpg",
    description:
      "Dinosaures, planétarium, baleine bleue : excellent choix avec enfants et ados.",
    tip: "Choisir 2 ou 3 zones maximum et réserver le planétarium séparément seulement si la famille en a vraiment envie.",
    borough: "Manhattan",
    category: "Musée",
    duration: "Option 2 h 30",
    map: { label: "5", lat: 40.7813, lng: -73.9735 },
  },
  {
    id: "met",
    title: "Metropolitan Museum of Art",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Metropolitan_Museum_of_Art_%28The_Met%29_-_Central_Park.jpg",
    description:
      "Immense musée d'art : Égypte, armures, peinture européenne, rooftop selon saison.",
    tip: "À préférer si la famille aime l'histoire et l'art ; sinon garder AMNH comme option plus accessible avec enfants.",
    borough: "Manhattan",
    category: "Musée",
    duration: "Option 2 h",
    map: { label: "6", lat: 40.7794, lng: -73.9632 },
  },
  {
    id: "hudson-yards",
    title: "Hudson Yards",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Hudson_Yards_from_High_Line_2019.jpg",
    description:
      "Quartier moderne, buildings récents, accès direct à la High Line.",
    tip: "Bon point de départ avec la ligne 7, avant de descendre la High Line vers Chelsea.",
    borough: "Manhattan",
    category: "Quartier",
    duration: "45 min",
    map: { label: "7", lat: 40.7538, lng: -74.001 },
  },
  {
    id: "vessel",
    title: "Vessel",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Vessel_%28structure%29_from_Hudson_Yards.jpg",
    description:
      "Structure monumentale de Hudson Yards, à voir depuis la plaza ou avec billet si l'accès intérieur est ouvert.",
    tip: "Vérifier horaires, billets et règles d'accès sur le site officiel le jour de la visite.",
    borough: "Manhattan",
    category: "Quartier",
    duration: "15-30 min",
  },
  {
    id: "high-line",
    title: "High Line",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/High_Line_20th_Street_looking_downtown.jpg",
    description:
      "Ancienne voie ferrée transformée en promenade végétalisée au-dessus des rues.",
    tip: "Marcher de Hudson Yards vers Chelsea Market pour finir sur une pause déjeuner/clim plus facile.",
    borough: "Manhattan",
    category: "Parc",
    duration: "1 h 15",
    map: { label: "8", lat: 40.7479, lng: -74.0048 },
  },
  {
    id: "chelsea-market",
    title: "Chelsea Market",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Chelsea_Market,_NYC.jpg",
    description:
      "Marché couvert avec food stalls, boutiques et ambiance industrielle.",
    tip: "Très pratique pour déjeuner, mais choisir un point de rendez-vous car le marché peut être dense.",
    borough: "Manhattan",
    category: "Pause",
    duration: "1 h 15",
  },
  {
    id: "little-island",
    title: "Little Island",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Little_Island_New_York_City.jpg",
    description:
      "Parc public construit sur des piliers au-dessus de l'Hudson, original et agréable pour une pause.",
    tip: "À garder optionnel après Chelsea Market ; vérifier l'accès si événement ou forte affluence.",
    borough: "Manhattan",
    category: "Parc",
    duration: "45 min",
  },
  {
    id: "moma-ps1",
    title: "MoMA PS1",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/MoMA_PS1_courtyard.jpg",
    description:
      "Centre d'art contemporain à Long Island City, plus alternatif que les grands musées classiques.",
    tip: "À faire seulement si une exposition vous intéresse ; vérifier horaires et jours d'ouverture avant de partir.",
    borough: "Queens",
    category: "Musée",
    duration: "Option 1 h",
  },
  {
    id: "flushing",
    title: "Flushing",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Main_Street_Flushing_Queens_NY.jpg",
    description:
      "Quartier vivant du Queens, connu pour sa cuisine asiatique et son ambiance très différente de Manhattan.",
    tip: "Y aller avec la ligne 7 jusqu'à Flushing-Main St et choisir une adresse food avant d'arriver.",
    borough: "Queens",
    category: "Quartier",
    duration: "Option 2 h",
    map: { label: "15", lat: 40.759, lng: -73.8297 },
  },
  {
    id: "astoria",
    title: "Astoria",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Astoria_Park_Hell_Gate_Bridge.jpg",
    description:
      "Quartier agréable du Queens, restaurants grecs, Astoria Park et vue sur les ponts.",
    tip: "Bonne option dîner plus locale ; vérifier le retour métro selon l'heure et la fatigue.",
    borough: "Queens",
    category: "Quartier",
    duration: "Option soirée",
    map: { label: "16", lat: 40.7797, lng: -73.922 },
  },
  {
    id: "soho",
    title: "SoHo",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/SoHo_Cast_Iron_Historic_District.jpg",
    description:
      "Boutiques, façades cast-iron, rues animées et très photogéniques.",
    tip: "Prévoir du temps libre, mais fixer un point de rendez-vous si le groupe se sépare pour les boutiques.",
    borough: "Manhattan",
    category: "Quartier",
    duration: "1 h",
    map: { label: "9", lat: 40.724, lng: -74.0007 },
  },
  {
    id: "chinatown",
    title: "Chinatown",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Canal_Street_Chinatown_New_York_City.jpg",
    description:
      "Rues denses, restaurants, snacks, marchés et ambiance unique.",
    tip: "Idéal pour un déjeuner/snack, avec un peu de souplesse car certaines adresses sont petites ou très fréquentées.",
    borough: "Manhattan",
    category: "Quartier",
    duration: "1 h",
    map: { label: "10", lat: 40.7158, lng: -73.997 },
  },
  {
    id: "little-italy",
    title: "Little Italy",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Mulberry_Street_Little_Italy_New_York.jpg",
    description:
      "Petite zone historique autour de Mulberry Street, restaurants italiens et décor touristique.",
    tip: "À voir en passage court depuis Chinatown, sans en faire une étape longue.",
    borough: "Manhattan",
    category: "Quartier",
    duration: "30 min",
  },
  {
    id: "washington-square",
    title: "Washington Square Park",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Washington_Square_Park_Arch.jpg",
    description:
      "Parc vivant de Greenwich Village, arche célèbre, musiciens, étudiants et ambiance locale.",
    tip: "Très bon final après SoHo/Chinatown pour s'asseoir, observer l'ambiance et laisser retomber le rythme.",
    borough: "Manhattan",
    category: "Parc",
    duration: "45 min",
  },
  {
    id: "airport",
    title: "Aéroport / départ",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/AirTrain_JFK_Terminal_4.jpg",
    description:
      "Dernier jour dédié au départ : check-out, transfert et marge confortable pour les contrôles. Aucun autre programme n'est prévu.",
    tip: "Point placé sur JFK par défaut ; confirmer l'aéroport, le terminal et le temps de trajet la veille du départ.",
    borough: "Queens",
    category: "Transport",
    duration: "Départ",
    map: { label: "✈", lat: 40.6413, lng: -73.7781 },
  },
];

const days: DayPlan[] = [
  {
    id: "day-4",
    date: "Samedi 4 juillet",
    title: "Arrivée, douanes et installation",
    image:
      "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1c/b5/46/53/exterior.jpg?w=1200&h=800&s=1",
    summary:
      "Jour d'atterrissage : on ne cherche pas à “visiter New York”, on réussit l'arrivée. Objectif réaliste : passer les contrôles, récupérer les bagages, rejoindre l'hôtel, manger simple si besoin et garder Gantry ou le feu d'artifice comme bonus uniquement si tout le monde tient encore debout.",
    route:
      "JFK -> AirTrain + métro ou taxi/VTC -> hôtel. Recalculer dans Google Maps à l'atterrissage avec bagages et fatigue.",
    siteIds: ["hotel", "gantry", "fireworks"],
    layout: "full",
  },
  {
    id: "day-5",
    date: "Dimanche 5 juillet",
    title: "Midtown spectaculaire",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/1_times_square_night_2013.jpg",
    summary:
      "Première vraie journée Manhattan : on commence par l'énergie pure de Times Square, puis on alterne pauses, beaux bâtiments et grands halls pour éviter l'overdose. La récompense du jour, c'est Top of the Rock : voir enfin la ville d'en haut, avec Central Park d'un côté et l'Empire State en face.",
    route: "Hôtel -> Queensboro Plaza -> 7/N/W -> Times Square / Midtown. Retour par 7/N/W ou F selon position.",
    siteIds: ["times-square", "bryant", "library", "grand-central", "rockefeller", "top-rock"],
  },
  {
    id: "day-6",
    date: "Lundi 6 juillet",
    title: "Statue & Lower Manhattan",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Statue_of_Liberty_7.jpg",
    summary:
      "Journée histoire grandeur nature : ferry dans le port, Statue de la Liberté, Ellis Island, puis retour dans le Manhattan financier. C'est plus dense qu'une journée photo : prévoir de la marge pour la sécurité, les files, le bateau et les émotions au 9/11 Memorial.",
    route: "Hôtel -> 21 St-Queensbridge -> F + R/W ou 4/5 -> Whitehall / Bowling Green. Puis ferry Statue City Cruises.",
    siteIds: ["liberty", "ellis", "wall-street", "oculus", "memorial911"],
  },
  {
    id: "day-7",
    date: "Mardi 7 juillet",
    title: "Brooklyn Bridge & DUMBO",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Brooklyn_Bridge_Postdlf.jpg",
    summary:
      "Une des journées les plus ciné du voyage : traverser le Brooklyn Bridge à pied, arriver dans les rues pavées de DUMBO, faire les photos iconiques puis ralentir dans Brooklyn Bridge Park. Le bon rythme : marcher, shooter, boire, s'asseoir, puis profiter de la skyline.",
    route: "Hôtel -> Queensboro Plaza -> 7 -> Grand Central -> 4/5/6 -> Brooklyn Bridge-City Hall. Traversée Manhattan -> Brooklyn.",
    siteIds: ["brooklyn-bridge", "dumbo", "carousel", "bbpark"],
  },
  {
    id: "day-8",
    date: "Mercredi 8 juillet",
    title: "Central Park + musée",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Central_Park_New_York_City_New_York_23_crop.jpg",
    summary:
      "Journée respiration : Central Park sert de grand reset au milieu du séjour. Ensuite, on choisit franchement : dinosaures et baleine bleue à l'AMNH, chefs-d'oeuvre au Met, ou simplement une pause plus légère si la fatigue monte.",
    route: "Hôtel -> 21 St-Queensbridge -> F -> 57 St ou Lexington Av/63 St. Ensuite marche vers Central Park, puis musée choisi.",
    siteIds: ["central-park", "bethesda", "amnh", "met"],
  },
  {
    id: "day-9",
    date: "Jeudi 9 juillet",
    title: "High Line, Chelsea & Hudson Yards",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/High_Line_20th_Street_looking_downtown.jpg",
    summary:
      "New York version moderne : tours de Hudson Yards, Vessel en repère visuel, puis High Line au-dessus des rues. La journée marche bien parce qu'elle descend naturellement vers Chelsea Market pour manger, puis Little Island si le groupe veut encore de l'air et des vues sur l'Hudson.",
    route: "Hôtel -> Queensboro Plaza -> 7 direct -> 34 St-Hudson Yards. Puis à pied : Hudson Yards -> High Line -> Chelsea Market.",
    siteIds: ["hudson-yards", "vessel", "high-line", "chelsea-market", "little-island"],
  },
  {
    id: "day-10",
    date: "Vendredi 10 juillet",
    title: "Queens local & skyline",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Gantry_Plaza_State_Park_2012.jpg",
    summary:
      "Journée volontairement plus libre : on reste côté Queens pour retrouver de l'air, des quartiers plus locaux et moins de pression. Gantry donne la skyline, MoMA PS1 donne l'option art, Flushing l'option food adventure, Astoria l'option soirée plus calme.",
    route: "Long Island City local. Gantry à pied/VTC court ; Flushing par 7 ; Astoria par N/W. Choisir 1 ou 2 options.",
    siteIds: ["gantry", "moma-ps1", "flushing", "astoria"],
  },
  {
    id: "day-11",
    date: "Samedi 11 juillet",
    title: "SoHo, Chinatown, Little Italy",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Canal_Street_Chinatown_New_York_City.jpg",
    summary:
      "Dernière vraie journée en ville : moins de monuments, plus d'ambiance. SoHo pour les façades et boutiques, Chinatown pour les snacks, Little Italy en passage court, puis Washington Square Park pour finir sur une scène très New York : musique, étudiants, fontaine et vie de rue.",
    route: "Hôtel -> 21 St-Queensbridge -> F -> Broadway-Lafayette. À pied : SoHo -> Chinatown / Little Italy -> Washington Square.",
    siteIds: ["soho", "chinatown", "little-italy", "washington-square"],
  },
  {
    id: "day-12",
    date: "Dimanche 12 juillet",
    title: "Départ vers l'aéroport",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/AirTrain_JFK_Terminal_4.jpg",
    summary:
      "Jour de départ : on protège la fin du voyage. Pas de visite ajoutée, pas de sprint inutile : petit-déj, sacs, check-out, trajet aéroport et marge. L'objectif est simple : arriver calme, avec batteries chargées, passeports prêts et souvenirs encore frais.",
    route: "Hôtel -> JFK par taxi/VTC ou métro + AirTrain. Départ hôtel environ 4 h avant vol international, à ajuster avec Google Maps.",
    siteIds: ["hotel", "airport"],
  },
];

const filters: Filter[] = [
  "Tous",
  "Manhattan",
  "Brooklyn",
  "Queens",
  "New York Harbor",
  "Incontournables",
  "Musées",
  "Quartiers",
];
const dayColors = [
  "#0f766e",
  "#2563eb",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#16a34a",
  "#db2777",
  "#475569",
];

const siteById = new Map(sites.map((site) => [site.id, site]));
const commonsSearchTerms = new Map<string, string>([
  ["hotel", "Wingate by Wyndham Long Island City 38-70 12th Street"],
  ["fireworks", "File:Fireworks over the East Village of New York City.JPG"],
  ["gantry", "File:Pepsi-Cola sign in Gantry Plaza State Park, Long Island City, New York.jpg"],
  ["times-square", "File:Times Square at night- Manhattan, New York City, United States of America (9867854326).jpg"],
  ["bryant", "File:Bryant Park New York (11599442025).jpg"],
  ["library", "File:New York Public Library Main Branch Exterior.jpg"],
  ["grand-central", "File:Grand Central Station Main Concourse Jan 2006.jpg"],
  ["rockefeller", "Rockefeller Center Prometheus"],
  ["top-rock", "File:Top of the Rock, New York, United States (Unsplash NvGwP hw1iw).jpg"],
  ["liberty", "File:Statue of Liberty 7.jpg"],
  ["ellis", "File:Great Hall of the Ellis Island Main Building.jpg"],
  ["wall-street", "File:New York Stock Exchange 02010.JPG"],
  ["oculus", "File:One World Trade Center through the Oculus (91538).jpg"],
  ["memorial911", "File:New York - National September 11 Memorial South Pool - April 2012 - 9693C.jpg"],
  ["brooklyn-bridge", "File:Brooklyn Bridge, New York, United States (Unsplash DiBu1qTQQ8s).jpg"],
  ["dumbo", "File:Adams Street beneath the Manhattan Bridge, Dumbo, Brooklyn, New York.jpg"],
  ["carousel", "File:Jane's Carousel 2.jpg"],
  ["bbpark", "File:Pont de Brooklyn de nuit - Octobre 2008 edit.jpg"],
  ["central-park", "File:Central Park New York City New York 23 cropped.jpg"],
  ["bethesda", "File:Bethesda Fountain (81527).jpg"],
  ["amnh", "File:American Museum of Natural History, South Facade.jpg"],
  ["met", "File:Metropolitan Museum of Art, New York City NY, entrance.jpg"],
  ["hudson-yards", "File:10 Hudson Yards New York NY 2014 09 02 08.JPG"],
  ["vessel", "File:The Vessel, Hudson Yards, New York City, June 2019.jpg"],
  ["high-line", "File:The High Line, New York (17643199203).jpg"],
  ["chelsea-market", "File:Chelsea Market entrance.jpg"],
  ["little-island", "File:View of Lower Manhattan from Little Island, New York City, 20231001 1818 1506.jpg"],
  ["moma-ps1", "File:MoMA PS1 rooftop August 2013 002.jpg"],
  ["flushing", "File:Main Street, Flushing, Queens, New York City (1920).jpg"],
  ["astoria", "File:Hell Gate Bridge (84459)p.jpg"],
  ["soho", "File:SoHo Cast Iron Historic District 036.JPG"],
  ["chinatown", "File:Chinatown, New York City - panoramio.jpg"],
  ["little-italy", "File:Mulberry Street NYC c1900 LOC 3g04637u edit.jpg"],
  ["washington-square", "File:Washington Square Park Arch, New York City (5269029966).jpg"],
  ["airport", "File:AirTrain JFK Terminal 4.jpg"],
]);
const siteHighlights = new Map<string, string[]>([
  [
    "hotel",
    [
      "Adresse à garder sous la main : 38-70 12th Street, Long Island City, Queens, NY 11101.",
      "Repérer les deux stations utiles : 21 St-Queensbridge pour F et Queensboro Plaza pour 7/N/W.",
      "Prévoir le retour hôtel comme pause possible les jours très chauds.",
      "Sauvegarder l'adresse dans Google Maps / Apple Plans pour taxis et VTC.",
      "Le dernier jour, partir depuis l'hôtel directement vers l'aéroport, sans visite ajoutée.",
    ],
  ],
  [
    "fireworks",
    [
      "Vérifier le lieu officiel du feu d'artifice 2026 avant de décider.",
      "Rester côté Queens si la famille est fatiguée après l'arrivée.",
      "Prévoir bouchons d'oreilles ou casque pour les enfants sensibles au bruit.",
      "Éviter les zones ultra-denses de Midtown et Lower Manhattan le soir d'arrivée.",
      "Préparer un plan retour simple vers l'hôtel avant de partir.",
    ],
  ],
  [
    "gantry",
    [
      "Photographier la skyline depuis les anciens portiques Gantry.",
      "Marcher jusqu'au panneau Pepsi-Cola, très photogénique au coucher du soleil.",
      "Repérer l'Empire State Building et le siège de l'ONU de l'autre côté de l'East River.",
      "Faire une pause glace ou boisson à Long Island City avant de rentrer.",
      "Revenir de nuit pour les reflets lumineux sur Manhattan.",
    ],
  ],
  [
    "times-square",
    [
      "Monter sur les marches rouges TKTS pour la vue d'ensemble.",
      "Regarder One Times Square, immeuble de la boule du Nouvel An.",
      "Traverser les zones piétonnes entre Broadway et 7th Avenue.",
      "Entrer rapidement dans M&M's World ou Disney Store si les enfants veulent une pause boutique.",
      "Passer plutôt en fin de journée pour profiter des écrans sans y rester trop longtemps.",
    ],
  ],
  [
    "bryant",
    [
      "S'asseoir côté pelouse pour une vraie pause fraîcheur.",
      "Observer la façade arrière de la New York Public Library.",
      "Tester les chaises mobiles typiques du parc.",
      "Chercher les petites tables à l'ombre pour goûter ou café.",
      "Utiliser ce parc comme pause entre Times Square et Grand Central.",
    ],
  ],
  [
    "library",
    [
      "Photographier les lions Patience et Fortitude à l'entrée.",
      "Entrer dans l'Astor Hall et lever les yeux sur le marbre.",
      "Voir la Rose Main Reading Room si elle est accessible.",
      "Passer par la boutique pour un souvenir calme et utile.",
      "Limiter la visite à 30-45 minutes pour garder de l'énergie pour Midtown.",
    ],
  ],
  [
    "grand-central",
    [
      "Se placer au centre du Main Concourse pour le plafond zodiacal.",
      "Repérer l'horloge à quatre faces du kiosque d'information.",
      "Tester la Whispering Gallery près de l'Oyster Bar.",
      "Chercher les glands et feuilles de chêne, symboles Vanderbilt.",
      "Faire une pause au Dining Concourse si chaleur ou pluie.",
    ],
  ],
  [
    "rockefeller",
    [
      "Descendre vers la Lower Plaza et la statue Prometheus.",
      "Traverser les Channel Gardens vers la 5th Avenue.",
      "Passer devant Radio City Music Hall pour la façade néon.",
      "Repérer la patinoire ou son aménagement d'été selon la saison.",
      "Garder Top of the Rock comme grand moment panoramique du quartier.",
    ],
  ],
  [
    "top-rock",
    [
      "Réserver un créneau proche du coucher du soleil.",
      "Comparer la vue Central Park au nord et Empire State Building au sud.",
      "Monter jusqu'au niveau extérieur du 70e étage pour la vue sans vitre.",
      "Prévoir 45 à 75 minutes sur place, hors file d'attente.",
      "Faire les photos famille avant que la terrasse ne soit trop dense.",
    ],
  ],
  [
    "liberty",
    [
      "Prendre un ferry via Statue City Cruises, seul vendeur officiel pour Liberty Island et Ellis Island.",
      "Faire le tour de Liberty Island pour voir la statue sous plusieurs angles.",
      "Visiter le Statue of Liberty Museum et voir la torche originale.",
      "Monter sur la terrasse du Statue of Liberty Museum pour la vue sur le port si elle est accessible.",
      "Réserver très en avance pour pedestal ou crown access, qui sont limités et soumis à sécurité supplémentaire.",
    ],
  ],
  [
    "ellis",
    [
      "Commencer par le Baggage Room au rez-de-chaussée.",
      "Monter dans le Great Hall / Registry Room, coeur historique du musée.",
      "Voir Through America's Gate pour comprendre le parcours des immigrants.",
      "Passer devant l'American Immigrant Wall of Honor à l'extérieur.",
      "Utiliser l'audio-guide du musée si disponible pour donner du contexte aux enfants.",
    ],
  ],
  [
    "wall-street",
    [
      "Photographier la façade du New York Stock Exchange.",
      "Passer devant Federal Hall et la statue de George Washington.",
      "Chercher Trinity Church au bout de Wall Street.",
      "Faire un arrêt rapide au Charging Bull si l'itinéraire le permet.",
      "Garder la visite courte : c'est surtout une séquence photo.",
    ],
  ],
  [
    "oculus",
    [
      "Entrer par le grand hall blanc pour l'effet architectural.",
      "Photographier les nervures depuis le niveau principal.",
      "Utiliser l'Oculus comme pause climatisée après le 9/11 Memorial.",
      "Repérer les accès métro/PATH pour comprendre le hub.",
      "Prendre une boisson ou un snack dans le centre commercial si besoin.",
    ],
  ],
  [
    "memorial911",
    [
      "Faire le tour du bassin nord puis du bassin sud en silence.",
      "Chercher les roses blanches placées sur certains noms.",
      "Expliquer brièvement le lieu aux enfants avant d'arriver.",
      "Voir le Survivor Tree dans la plaza.",
      "Décider à l'avance si le musée est adapté à l'âge et à l'énergie du groupe.",
    ],
  ],
  [
    "brooklyn-bridge",
    [
      "Commencer côté Manhattan pour finir à DUMBO.",
      "Rester sur la promenade piétonne et suivre la signalisation sur le pont.",
      "S'arrêter au milieu pour les câbles et la skyline.",
      "Photographier Lower Manhattan depuis l'approche Brooklyn.",
      "Partir tôt le matin ou en fin de journée pour éviter la foule forte.",
    ],
  ],
  [
    "dumbo",
    [
      "Faire la photo classique à Washington Street avec le Manhattan Bridge.",
      "Marcher sur les pavés autour de Water Street.",
      "Monter vers Pebble Beach pour la vue sur Brooklyn Bridge.",
      "Prévoir une pause à Time Out Market ou près du waterfront.",
      "Rester jusqu'à la lumière dorée si tout le monde est encore en forme.",
    ],
  ],
  [
    "carousel",
    [
      "Voir le carrousel historique sous verrière.",
      "Regarder la skyline depuis la promenade juste devant.",
      "Faire un tour si les enfants en ont envie, sinon simple pause photo.",
      "Combiner avec Pebble Beach et Brooklyn Bridge Park.",
      "Vérifier les horaires le jour même avant de promettre l'activité.",
    ],
  ],
  [
    "bbpark",
    [
      "Marcher le long des piers pour varier les vues sur Manhattan.",
      "Faire une pause à Pier 1 ou Pier 2 selon la fatigue.",
      "Chercher un point de vue sur Statue de la Liberté au loin.",
      "Prévoir glace ou snack avant le retour métro/ferry.",
      "Choisir ce parc pour un coucher de soleil plus calme qu'à Manhattan.",
    ],
  ],
  [
    "central-park",
    [
      "Entrer par le sud ou l'est selon le musée choisi ensuite.",
      "Traverser The Mall si vous voulez la grande allée iconique.",
      "Passer par Bow Bridge pour une photo très classique.",
      "Se limiter à une zone : Bethesda, The Lake, Ramble ou musée.",
      "Prévoir eau, casquettes et pauses bancs en juillet.",
    ],
  ],
  [
    "bethesda",
    [
      "Descendre l'escalier vers la Bethesda Fountain.",
      "Regarder l'Angel of the Waters au centre de la fontaine.",
      "Passer sous l'arcade pour le plafond en tuiles Minton.",
      "Écouter les musiciens souvent installés sous la terrasse.",
      "Photographier The Lake depuis la terrasse supérieure.",
    ],
  ],
  [
    "amnh",
    [
      "Commencer par les Fossil Halls et le T. rex.",
      "Voir la baleine bleue dans le Hall of Ocean Life.",
      "Passer par le Rose Center / Hayden Planetarium si vous prenez le billet adapté.",
      "Choisir 2 ou 3 halls maximum pour éviter la saturation.",
      "Utiliser la boutique ou les cafés du musée comme pause familiale.",
    ],
  ],
  [
    "met",
    [
      "Voir le Temple of Dendur dans l'aile égyptienne.",
      "Passer par les armures si les enfants aiment l'histoire.",
      "Choisir quelques salles de peinture européenne, pas tout le musée.",
      "Monter au rooftop si ouvert en saison.",
      "Prévoir une sortie directe vers Central Park pour respirer après la visite.",
    ],
  ],
  [
    "hudson-yards",
    [
      "Arriver par la ligne 7 à 34 St-Hudson Yards.",
      "Voir Vessel depuis l'extérieur et la place centrale.",
      "Repérer The Shed et les tours modernes du quartier.",
      "Faire une pause fraîcheur dans le centre commercial si besoin.",
      "Commencer ici avant de descendre la High Line vers Chelsea.",
    ],
  ],
  [
    "vessel",
    [
      "Photographier la structure depuis la base.",
      "Chercher les reflets cuivrés selon l'heure de la journée.",
      "Vérifier horaires, billets et règles d'accès sur le site officiel avant la visite.",
      "Le combiner avec Hudson Yards plutôt que d'en faire une visite séparée.",
      "Utiliser ce point comme départ clair pour la High Line.",
    ],
  ],
  [
    "high-line",
    [
      "Marcher de Hudson Yards vers Chelsea pour suivre le bon sens du planning.",
      "Observer les anciennes rails intégrées dans la promenade.",
      "S'arrêter aux belvédères sur les rues de West Chelsea.",
      "Regarder les installations d'art public en chemin.",
      "Sortir vers Chelsea Market si la chaleur ou la faim arrive.",
    ],
  ],
  [
    "chelsea-market",
    [
      "Faire le tour des food stalls avant de choisir le déjeuner.",
      "Prévoir une option simple pour chacun : tacos, pizza, bakery ou lobster roll.",
      "Regarder les détails industriels du bâtiment.",
      "Utiliser les toilettes et la clim avant de repartir.",
      "Sortir côté 9th Avenue ou rejoindre Little Island selon l'énergie.",
    ],
  ],
  [
    "little-island",
    [
      "Monter les chemins pour les points de vue sur l'Hudson.",
      "Regarder l'architecture en tulipes depuis l'extérieur.",
      "Faire une courte pause assise dans l'amphithéâtre si ouvert.",
      "Photographier le coucher de soleil côté fleuve.",
      "Garder cette étape optionnelle après Chelsea Market.",
    ],
  ],
  [
    "moma-ps1",
    [
      "Voir la cour extérieure avant ou après les salles.",
      "Se concentrer sur une exposition temporaire plutôt que tout faire.",
      "Comparer l'ambiance avec les grands musées de Manhattan.",
      "Prévoir une visite courte, idéale en journée Queens plus calme.",
      "Vérifier horaires et expositions avant de partir.",
    ],
  ],
  [
    "flushing",
    [
      "Arriver par la ligne 7 jusqu'à Flushing-Main St.",
      "Explorer Main Street et ses vitrines asiatiques.",
      "Choisir un food court ou une adresse de dumplings/noodles.",
      "Passer par un supermarché asiatique pour snacks et boissons.",
      "Garder cette sortie comme expérience quartier plutôt que monument.",
    ],
  ],
  [
    "astoria",
    [
      "Aller à Astoria Park pour la vue sur Hell Gate Bridge.",
      "Prévoir un dîner grec ou méditerranéen dans le quartier.",
      "Marcher au bord de l'East River si la météo est agréable.",
      "Photographier les ponts depuis le parc.",
      "Choisir Astoria pour une soirée plus locale et moins touristique.",
    ],
  ],
  [
    "soho",
    [
      "Repérer les façades cast-iron autour de Greene Street.",
      "Prévoir du temps libre shopping sans programme trop serré.",
      "Photographier les escaliers de secours et pavés latéraux.",
      "Passer par Prince Street ou Spring Street pour l'ambiance.",
      "Combiner avec Washington Square plutôt que remonter trop loin.",
    ],
  ],
  [
    "chinatown",
    [
      "Marcher sur Canal Street pour l'ambiance dense.",
      "Chercher un déjeuner simple : dumplings, noodles ou bakery.",
      "Passer par Mott Street pour une rue plus typique.",
      "Entrer dans une épicerie ou bakery pour snacks à partager.",
      "Garder de la monnaie/carte prête : certains petits spots vont vite.",
    ],
  ],
  [
    "little-italy",
    [
      "Passer par Mulberry Street pour le décor historique.",
      "Faire seulement une courte boucle depuis Chinatown.",
      "Choisir dessert ou café plutôt qu'un gros repas touristique.",
      "Regarder les enseignes et terrasses pour les photos.",
      "Continuer vers SoHo ou Washington Square sans trop s'attarder.",
    ],
  ],
  [
    "washington-square",
    [
      "Photographier l'arche avec la perspective sur Fifth Avenue.",
      "Faire une pause autour de la fontaine centrale.",
      "Regarder les musiciens, joueurs d'échecs et performances de rue.",
      "Utiliser le parc comme final vivant après SoHo/Chinatown.",
      "Prévoir un snack ou une boisson dans Greenwich Village autour.",
    ],
  ],
  [
    "airport",
    [
      "Confirmer l'aéroport exact et le terminal la veille.",
      "Quitter l'hôtel environ 4 h avant le vol international.",
      "Garder passeports, billets, ESTA et batteries accessibles.",
      "Prévoir marge supplémentaire si taxi, trafic ou bagages lourds.",
      "Ne pas ajouter de visite : dernier jour dédié au départ.",
    ],
  ],
]);
const teenTips = new Map<string, string>([
  ["hotel", "Mission : épingle l'hôtel dans Maps et repère la station la plus simple. Si tu retrouves le chemin sans aide, tu deviens navigateur du jour."],
  ["fireworks", "À jouer comme une mission repérage : vérifier le spot officiel 2026, la foule annoncée et le plan retour. Si ça sent la galère, skyline locale et dodo."],
  ["gantry", "Défi photo : prendre la skyline avec les anciens portiques et le panneau Pepsi dans la même série. C'est le spot LIC facile qui fait très carte postale."],
  ["times-square", "Version ado : 20 minutes chrono, une photo sur les marches TKTS, un écran géant préféré, puis sortie avant l'overdose de foule et de mascottes."],
  ["bryant", "Pause stratégique : chaises mobiles, tables à l'ombre, toilettes, recharge mentale. C'est le sas de décompression entre néons et architecture."],
  ["library", "À vendre comme décor de film : lions à l'entrée, marbre de l'Astor Hall, ambiance presque Poudlard si les salles historiques sont ouvertes."],
  ["grand-central", "Mini-jeu : trouver le plafond zodiacal peint à l'envers, l'horloge à quatre faces et tester la Whispering Gallery comme un vieux bug acoustique."],
  ["rockefeller", "Spot repères : Prometheus, Channel Gardens, Radio City. Cherche l'angle le plus ciné avant de monter à Top of the Rock."],
  ["top-rock", "Moment photo premium : Empire State en face, Central Park au nord, terrasse sans vitre au 70e. Batterie chargée obligatoire."],
  ["liberty", "Anecdote utile : la torche originale est dans le musée. Défi : trouver l'angle où la statue paraît énorme sans contre-plongée ratée."],
  ["ellis", "À rendre vivant : imaginer le passage dans le Great Hall avec nom, langue, papiers et stress du contrôle. C'est plus fort si on suit un parcours réel."],
  ["wall-street", "Format ado efficace : NYSE, Federal Hall, Trinity Church, puis stop. Bonus si quelqu'un explique pourquoi une rue aussi courte pèse autant."],
  ["oculus", "Spot ultra graphique : lignes blanches, symétrie, vidéos verticales. Défi : faire une photo qui donne l'impression d'être dans un vaisseau spatial."],
  ["memorial911", "À annoncer clairement : ici, pas de mode selfie. On observe les noms, l'eau, le Survivor Tree, et on garde le ton respectueux."],
  ["brooklyn-bridge", "Défi marche : choisir trois pauses photo max, sinon la traversée n'avance jamais. Meilleur souvenir si tout le monde garde de l'eau."],
  ["dumbo", "Le cliché Washington Street est assumé : Manhattan Bridge dans l'axe, pavés, briques. À toi de faire mieux que la photo Instagram standard."],
  ["carousel", "Même si c'est plutôt enfantin, le combo carrousel vintage + skyline + verrière marche bien en photo. Sinon, pause rapide waterfront."],
  ["bbpark", "Temps libre utile : skyline, snack, banc, coucher de soleil. Prends 10 minutes pour trouver ton meilleur cadrage de Manhattan."],
  ["central-park", "Plutôt que 'marcher dans un parc', lancer une quête : The Mall, Bow Bridge ou Bethesda. Un objectif clair évite la balade interminable."],
  ["bethesda", "Le plafond en tuiles Minton et les musiciens sous l'arcade donnent souvent le meilleur moment. S'arrêter et écouter deux minutes."],
  ["amnh", "Mode best-of : T. rex, baleine bleue de 94 pieds, météorites/espace. Chacun choisit un hall, personne ne subit tout le musée."],
  ["met", "Ne pas vendre ça comme 'un musée d'art' vague : Temple of Dendur, armures, rooftop si ouvert. Trois hits, pas marathon."],
  ["hudson-yards", "Ambiance ville futuriste : tours, The Shed, Vessel, métro 7. Bon moment pour parler urbanisme sans appeler ça un cours."],
  ["vessel", "À traiter comme objet bizarre de Manhattan : sculpture, escalier, polémique, sécurité. Photo depuis la base si l'accès ne motive pas."],
  ["high-line", "Promenade à scanner : anciens rails, art public, vues entre immeubles. Mission : repérer le meilleur street-view vivant."],
  ["chelsea-market", "Plan efficace : chacun repère une option food, puis vote rapide. Point de rendez-vous obligatoire, sinon tout le monde se perd dans les stands."],
  ["little-island", "Parc OVNI sur pilotis : chemins qui montent, vues Hudson, amphithéâtre. Bien en pause courte après le bruit de Chelsea Market."],
  ["moma-ps1", "À pitch comme labo d'art contemporain, pas musée classique. Si l'expo ne les accroche pas en 20 minutes, on garde l'énergie pour Queens."],
  ["flushing", "Mission food crawl : bubble tea, dumplings, bakery, supermarché asiatique. Le but est de tester, pas de cocher un monument."],
  ["astoria", "Soirée plus locale : pont Hell Gate, East River, dîner grec/méditerranéen. Bon contraste après les journées Manhattan très touristiques."],
  ["soho", "Quartier shopping/photo : cast-iron, vitrines, escaliers de secours. Autonomie possible avec horaire précis et point de ralliement."],
  ["chinatown", "Mission snack : trouver dumplings, bakery ou boisson à partager. Encore mieux si tu choisis un truc inconnu à goûter."],
  ["little-italy", "À garder en mode mini-scène : Mulberry Street, enseignes, dessert éventuel. Le vrai intérêt est le contraste avec Chinatown juste à côté."],
  ["washington-square", "Ambiance campus/NYU : arche, fontaine, musiciens, joueurs d'échecs. Bon spot pour juste rester et regarder la ville vivre."],
  ["airport", "Check avant départ : passeport, chargeur, écouteurs, batterie, gourde vide. Si tu oublies un câble, tu dépends des autres."],
]);

const parentInterestsByArea = new Map<string, ParentInterestPick>([
  [
    "lic",
    {
      papa:
        "Artbook @ MoMA PS1 pour livres d'art/photographie un peu pointus, puis Best Buy LIC si envie de gadgets rapides.",
      maman:
        "LIC Bar ou Debbie's pour une pause musique locale ; à garder en soirée si l'énergie est encore là.",
    },
  ],
  [
    "midtown",
    {
      papa:
        "Argosy Book Store pour vieux livres, cartes anciennes et éditions rares ; Kinokuniya près de Bryant Park pour livres/design/gadgets japonais.",
      maman:
        "Michael's Luxury Consignment côté Madison pour sacs de luxe vintage, ou Jazz Record Center si elle préfère une vraie parenthèse musique.",
    },
  ],
  [
    "downtown",
    {
      papa:
        "The Mysterious Bookshop à Tribeca pour polars, Sherlockiana et éditions signées ; Holographic Studios côté East Village si le thème UAP/illusion le motive.",
      maman:
        "Brookfield Place et Oculus pour sacs/boutiques au frais ; City Winery ou un spot live Downtown si on veut finir en musique.",
    },
  ],
  [
    "brooklyn",
    {
      papa:
        "Art of Play à Brooklyn Heights pour magie, puzzles et curiosités ; POWERHOUSE Arena à DUMBO pour beaux livres et photo.",
      maman:
        "Glam Expressway à DUMBO pour accessoires/sacs plus originaux ; St. Ann's Warehouse ou Vinyl + Thread pour une piste musique.",
    },
  ],
  [
    "central-uws",
    {
      papa:
        "Westsider Books près de l'AMNH pour vieux livres/occasion et disques ; Golden Sound Electronics pour audio vintage et réparation.",
      maman:
        "Westsider Records pour fouiller musique/vinyles ; The Niche Shop UWS/UES si elle veut regarder sacs et vintage.",
    },
  ],
  [
    "met-ues",
    {
      papa:
        "Librairie du Met et Neue Galerie Design Shop pour beaux livres/art ancien ; Argosy reste le meilleur crochet vieux livres si on descend Midtown.",
      maman:
        "Madison Avenue autour du Met pour sacs et vitrines premium ; pause musique possible via événements du Met ou Lincoln Center plus au sud-ouest.",
    },
  ],
  [
    "chelsea",
    {
      papa:
        "192 Books pour livres art/photo, PayMore Chelsea pour gadgets d'occasion, Rogue Music pour synthés/pro-audio vintage.",
      maman:
        "What Goes Around Comes Around ou The RealReal pour sacs vintage/luxe ; Chelsea Guitars ou Jazz Record Center pour musique.",
    },
  ],
  [
    "queens",
    {
      papa:
        "Artbook @ MoMA PS1 à LIC ; Micro Center ou boutiques de Main Street à Flushing si le sujet gadgets prend le dessus.",
      maman:
        "HiFi Records et Q.E.D. à Astoria pour musique/live ; à Flushing, Spin Music Discs ou Tune CD Store près de Roosevelt Ave.",
    },
  ],
  [
    "soho-village",
    {
      papa:
        "The Mysterious Bookshop à Tribeca, Aeon Bookstore pour occultisme/esotérisme, Mercer Street Books pour vieux livres et vinyles.",
      maman:
        "MZ Wallace SoHo, Bag-all Bleecker ou What Goes Around Comes Around pour sacs ; Washington Square donne souvent musique de rue.",
    },
  ],
  [
    "jfk",
    {
      papa:
        "InMotion ou iStore dans le terminal pour gadgets de voyage ; Hot Beat Electronics à Jamaica seulement si grosse marge avant l'aéroport.",
      maman:
        "Dernier jour sans détour : boutiques terminal pour accessoires/sacs pratiques, ou playlist calme avant embarquement.",
    },
  ],
]);

const parentInterestsBySite = new Map<string, ParentInterestPick>([
  [
    "hotel",
    {
      papa: "Depuis l'hôtel, Quackade pour arcade/VR rapide ; si Papa veut du vrai geek, filer vers Control à Greenpoint pour synthés modulaires ou Main Drag Music à Williamsburg.",
      maman: "Garder LIC Bar ou Debbie's en option musique locale le soir, sans retraverser Manhattan.",
    },
  ],
  [
    "fireworks",
    {
      papa: "Avant le feu, Quackade reste le plus simple pour arcade/VR ; Control est le détour pointu si on a vraiment du temps avant la foule.",
      maman: "Pour l'ambiance musique sans gros détour, regarder LIC Bar après la foule, ou Debbie's si un concert est programmé.",
    },
  ],
  [
    "gantry",
    {
      papa: "Depuis Gantry, Quackade pour arcade/VR ; pour le côté synthés et gadgets sérieux, Control et Main Drag Music sont les meilleurs détours Brooklyn.",
      maman: "Depuis Gantry, LIC Bar est le choix le plus proche pour musique live ou verre tranquille.",
    },
  ],
  [
    "times-square",
    {
      papa: "Guitar Center Manhattan pour synthés/claviers modernes et occases, puis Rogue Music si on veut du vrai vintage keys/pro-audio.",
      maman: "Bryant Park / Times Square permet un crochet vers Strand Times Square Kiosk pour livres-cadeaux ou Michael's Luxury Consignment plus chic.",
    },
  ],
  [
    "bryant",
    {
      papa: "Guitar Center Manhattan et Rogue Music sont les meilleurs détours synthés/claviers depuis Bryant ; Kinokuniya reste bonus gadgets japonais.",
      maman: "Kinokuniya côté papeterie/cadeaux, puis Michael's Luxury Consignment si elle veut une piste sacs vintage.",
    },
  ],
  [
    "library",
    {
      papa: "Après la NYPL, viser Guitar Center Manhattan pour tester des claviers récents ; Rogue Music si le but est vintage synth/pro-audio.",
      maman: "New York Public Library Shop pour beaux objets, ou Michael's Luxury Consignment si elle préfère sacs vintage.",
    },
  ],
  [
    "grand-central",
    {
      papa: "Depuis Grand Central, Guitar Center Manhattan pour claviers/synthés modernes ; Apple Grand Central seulement pour le côté gadget grand public.",
      maman: "Grand Central Market pour pause élégante ; Michael's Luxury Consignment reste le meilleur crochet sacs proche Midtown East.",
    },
  ],
  [
    "rockefeller",
    {
      papa: "Rogue Music pour synthés vintage/pro-audio, Guitar Center Manhattan pour claviers actuels ; Nintendo NY seulement si on bascule gaming.",
      maman: "Madison Avenue et Michael's Luxury Consignment pour sacs ; Radio City Music Hall si elle veut une touche musique/show.",
    },
  ],
  [
    "top-rock",
    {
      papa: "Avant/après la vue, faire court : Guitar Center Manhattan pour claviers/synthés, ou Rogue Music pour vintage si les horaires collent.",
      maman: "Autour de Rockefeller, regarder Michael's Luxury Consignment pour sacs ou Radio City Music Hall pour l'ambiance musique.",
    },
  ],
  [
    "liberty",
    {
      papa: "Au retour ferry, The Mysterious Bookshop pour mystère/polars ; Mercer Labs si on veut une expérience immersive très techno.",
      maman: "Après Battery Park, Brookfield Place est le plus pratique pour sacs/boutiques au frais.",
    },
  ],
  [
    "ellis",
    {
      papa: "Après Ellis Island, The Mysterious Bookshop colle au thème enquête/archives ; Mercer Labs donne une option immersive plus futuriste.",
      maman: "Brookfield Place donne une pause sacs/boutiques simple avant de continuer Downtown.",
    },
  ],
  [
    "wall-street",
    {
      papa: "Mercer Labs pour art immersif + tech, SPYSCAPE si on veut le délire espionnage interactif, ou The Mysterious Bookshop pour polar/enquête.",
      maman: "Oculus et Brookfield Place sont les options sacs/accessoires les plus proches et climatisées.",
    },
  ],
  [
    "oculus",
    {
      papa: "Depuis Oculus, Mercer Labs est le choix geek immersif numéro 1 ; SPYSCAPE vaut le détour si on veut une expérience espionnage plus interactive.",
      maman: "Oculus même pour shopping rapide ; Brookfield Place si elle veut un cadre plus calme et premium.",
    },
  ],
  [
    "memorial911",
    {
      papa: "Après le Memorial, rester sobre : Mercer Labs seulement si tout le monde veut une bascule immersive, sinon The Mysterious Bookshop pour une pause calme.",
      maman: "Brookfield Place permet une respiration au bord de l'eau avec boutiques et sacs sans repartir loin.",
    },
  ],
  [
    "brooklyn-bridge",
    {
      papa: "Si on pousse côté Williamsburg : Control pour modules Eurorack/synthés, Main Drag Music pour claviers et instruments vintage.",
      maman: "En descendant vers DUMBO, Glam Expressway pour accessoires/sacs originaux, puis St. Ann's Warehouse côté musique/scène.",
    },
  ],
  [
    "dumbo",
    {
      papa: "DUMBO peut devenir une mission synth Brooklyn : Control pour Eurorack/modulaire, Main Drag Music pour vintage keys et instruments.",
      maman: "Glam Expressway est le stop sacs/accessoires local ; Vinyl + Thread si elle veut fouiller musique/vinyles.",
    },
  ],
  [
    "carousel",
    {
      papa: "Depuis Jane's Carousel, Control et Main Drag Music sont les meilleurs détours instruments/synthés si on traverse vers Williamsburg.",
      maman: "Glam Expressway est à quelques rues pour accessoires ; St. Ann's Warehouse si une programmation musicale colle.",
    },
  ],
  [
    "bbpark",
    {
      papa: "Après Brooklyn Bridge Park, option geek musique : Control pour synthés modulaires ou Main Drag Music pour claviers vintage.",
      maman: "Glam Expressway pour une boutique sacs/accessoires locale, ou Vinyl + Thread pour musique et vintage.",
    },
  ],
  [
    "central-park",
    {
      papa: "Côté ouest, Hex&Co. West Side pour jeux de société/D&D, Westsider Books pour vieux livres, Golden Sound Electronics pour audio vintage.",
      maman: "Westsider Records pour musique sur l'UWS, ou The Niche Shop si elle préfère sacs/vintage.",
    },
  ],
  [
    "bethesda",
    {
      papa: "Depuis Bethesda, Hex&Co. West Side est le stop jeux le plus fun ; Westsider Books reste l'option vieux livres.",
      maman: "Les musiciens autour de Bethesda font déjà la pause musique ; Westsider Records prolonge le thème.",
    },
  ],
  [
    "amnh",
    {
      papa: "Après l'AMNH, Hex&Co. West Side pour jeux/D&D, Westsider Books pour vieux livres, Golden Sound Electronics pour audio vintage.",
      maman: "Westsider Records est le stop musique le plus naturel après l'AMNH ; The Niche Shop pour sacs/vintage UWS.",
    },
  ],
  [
    "met",
    {
      papa: "Après le Met, Hex&Co. Upper East Side pour jeux de société ; Librairie du Met pour beaux livres et design ancien.",
      maman: "Madison Avenue autour du Met pour vitrines et sacs ; Lincoln Center pour une vraie option musique plus tard.",
    },
  ],
  [
    "hudson-yards",
    {
      papa: "Rogue Music est prioritaire ici : synthés, samplers, claviers et pro-audio vintage/occasion ; B&H Photo Video seulement si photo/vidéo.",
      maman: "The Shops at Hudson Yards pour sacs/accessoires, ou The RealReal Chelsea pour luxe seconde main.",
    },
  ],
  [
    "vessel",
    {
      papa: "Vessel + Rogue Music si on veut synthés/claviers vintage ; Guitar Center Manhattan ou B&H Photo Video pour gear plus mainstream.",
      maman: "The Shops at Hudson Yards pour sacs ; What Goes Around Comes Around si on descend vers Chelsea/SoHo vintage.",
    },
  ],
  [
    "high-line",
    {
      papa: "High Line puis Rogue Music pour synthés/samplers/pro-audio ; B&H Photo Video ou Adorama si Papa veut le temple photo/vidéo/gear.",
      maman: "Chelsea Market puis The RealReal Chelsea pour sacs ; Chelsea Guitars si elle veut une touche musique.",
    },
  ],
  [
    "chelsea-market",
    {
      papa: "À Chelsea Market, Rogue Music est prioritaire pour claviers, synthés, samplers et pro-audio d'occasion ; B&H complète si le sujet devient photo/vidéo.",
      maman: "The RealReal Chelsea ou What Goes Around Comes Around pour sacs vintage/luxe ; Chelsea Guitars pour musique.",
    },
  ],
  [
    "little-island",
    {
      papa: "Après Little Island, viser Rogue Music pour synthés/pro-audio ; Adorama ou B&H si l'envie bascule vers photo, vidéo et gadgets.",
      maman: "Chelsea Guitars ou Jazz Record Center pour musique ; The RealReal Chelsea pour sacs.",
    },
  ],
  [
    "moma-ps1",
    {
      papa: "Depuis PS1, le vrai graal synth est Control à Greenpoint/Williamsburg ; Main Drag Music complète avec claviers vintage et instruments.",
      maman: "Debbie's ou LIC Bar pour musique locale en soirée après PS1.",
    },
  ],
  [
    "flushing",
    {
      papa: "Micro Center pour composants/gadgets ; si la priorité est synthés/claviers, mieux vaut garder Control ou Main Drag Music pour un détour Brooklyn.",
      maman: "Spin Music Discs ou Tune CD Store près de Roosevelt Ave pour musique ; boutiques Main Street pour accessoires.",
    },
  ],
  [
    "astoria",
    {
      papa: "Astoria est surtout audio/vinyle : HiFi Records ; pour synthés/instruments, Control et Main Drag Music restent les vraies adresses proches en Brooklyn.",
      maman: "HiFi Records pour musique, puis Q.E.D. pour spectacle local dans un format léger.",
    },
  ],
  [
    "soho",
    {
      papa: "Depuis SoHo, Forbidden Planet pour comics/sci-fi, 8 Bit And Up pour rétro gaming ; Rogue Music reste le vrai détour synthés/claviers vintage.",
      maman: "MZ Wallace SoHo, Bag-all Bleecker et What Goes Around Comes Around couvrent parfaitement sacs/accessoires.",
    },
  ],
  [
    "chinatown",
    {
      papa: "Chinatown : OS NYC pour gaming moderne, Chinatown Fair pour arcade historique ; pour synthés, garder Rogue Music ou Control selon le temps.",
      maman: "Canal/SoHo mène vite vers MZ Wallace SoHo ou What Goes Around Comes Around pour sacs.",
    },
  ],
  [
    "little-italy",
    {
      papa: "Depuis Mulberry, Up One SoHo pour collectibles, Chinatown Fair pour arcade old-school, The Mysterious Bookshop pour polar.",
      maman: "Remonter vers SoHo pour MZ Wallace SoHo ou What Goes Around Comes Around ; Washington Square pour musique de rue.",
    },
  ],
  [
    "washington-square",
    {
      papa: "Depuis Washington Square : Forbidden Planet pour comics/pop culture, 8 Bit And Up pour rétro gaming ; Rogue Music si l'objectif est synthés/claviers.",
      maman: "Washington Square offre souvent musique de rue ; Bag-all Bleecker et MZ Wallace SoHo restent proches pour sacs.",
    },
  ],
  [
    "airport",
    {
      papa: "InMotion ou iStore dans le terminal pour gadgets de voyage ; Hot Beat Electronics seulement si très grosse marge à Jamaica.",
      maman: "Pour le départ, rester terminal : iStore / InMotion pour accessoires pratiques, pas de détour sacs risqué.",
    },
  ],
]);

const parentInterestAreaBySite = new Map<string, string>([
  ["hotel", "lic"],
  ["fireworks", "lic"],
  ["gantry", "lic"],
  ["times-square", "midtown"],
  ["bryant", "midtown"],
  ["library", "midtown"],
  ["grand-central", "midtown"],
  ["rockefeller", "midtown"],
  ["top-rock", "midtown"],
  ["liberty", "downtown"],
  ["ellis", "downtown"],
  ["wall-street", "downtown"],
  ["oculus", "downtown"],
  ["memorial911", "downtown"],
  ["brooklyn-bridge", "brooklyn"],
  ["dumbo", "brooklyn"],
  ["carousel", "brooklyn"],
  ["bbpark", "brooklyn"],
  ["central-park", "central-uws"],
  ["bethesda", "central-uws"],
  ["amnh", "central-uws"],
  ["met", "met-ues"],
  ["hudson-yards", "chelsea"],
  ["vessel", "chelsea"],
  ["high-line", "chelsea"],
  ["chelsea-market", "chelsea"],
  ["little-island", "chelsea"],
  ["moma-ps1", "queens"],
  ["flushing", "queens"],
  ["astoria", "queens"],
  ["soho", "soho-village"],
  ["chinatown", "soho-village"],
  ["little-italy", "soho-village"],
  ["washington-square", "soho-village"],
  ["airport", "jfk"],
]);
const parentInterestPlaceQueries: [string, string][] = [
  ["The Mysterious Bookshop", "The Mysterious Bookshop, 58 Warren Street, New York, NY"],
  ["What Goes Around Comes Around", "What Goes Around Comes Around, SoHo, New York, NY"],
  ["Artbook @ MoMA PS1", "Artbook at MoMA PS1, 22-25 Jackson Avenue, Long Island City, NY"],
  ["Holographic Studios", "Holographic Studios, 172 East 2nd Street, New York, NY"],
  ["Michael's Luxury Consignment", "Michael's Luxury Consignment, Madison Avenue, New York, NY"],
  ["Jazz Record Center", "Jazz Record Center, 236 West 26th Street, New York, NY"],
  ["Golden Sound Electronics", "Golden Sound Electronics, 2206 Broadway, New York, NY"],
  ["POWERHOUSE Arena", "POWERHOUSE Arena, 28 Adams Street, Brooklyn, NY"],
  ["Brookfield Place", "Brookfield Place, 230 Vesey Street, New York, NY"],
  ["Mercer Street Books", "Mercer Street Books, 206 Mercer Street, New York, NY"],
  ["Washington Square", "Washington Square Park, New York, NY"],
  ["Chelsea Guitars", "Chelsea Guitars, 224 West 23rd Street, New York, NY"],
  ["Westsider Records", "Westsider Records, 233 West 72nd Street, New York, NY"],
  ["Westsider Books", "Westsider Books, 2246 Broadway, New York, NY"],
  ["MZ Wallace SoHo", "MZ Wallace SoHo, New York, NY"],
  ["Bag-all Bleecker", "Bag-all, Bleecker Street, New York, NY"],
  ["Spin Music Discs", "Spin Music Discs, 136-20 Roosevelt Avenue, Flushing, NY"],
  ["Tune CD Store", "Tune CD Store, 136-20 Roosevelt Avenue, Flushing, NY"],
  ["Argosy Book Store", "Argosy Book Store, 116 East 59th Street, New York, NY"],
  ["Kinokuniya", "Kinokuniya New York, 1073 Avenue of the Americas, New York, NY"],
  ["Art of Play", "Art of Play, 69 Atlantic Avenue, Brooklyn, NY"],
  ["Glam Expressway", "Glam Expressway, 145 Front Street, Brooklyn, NY"],
  ["St. Ann's Warehouse", "St. Ann's Warehouse, 45 Water Street, Brooklyn, NY"],
  ["Vinyl + Thread", "Vinyl + Thread, DUMBO, Brooklyn, NY"],
  ["Neue Galerie Design Shop", "Neue Galerie Design Shop, New York, NY"],
  ["PayMore Chelsea", "PayMore Chelsea, West 23rd Street, New York, NY"],
  ["Rogue Music", "Rogue Music Store, 220 West 30th Street, New York, NY"],
  ["Control", "Control Synthesizers and Electronic Devices, 67 West Street, Brooklyn, NY"],
  ["Main Drag Music", "Main Drag Music, 50 South 1st Street, Brooklyn, NY"],
  ["Guitar Center Manhattan", "Guitar Center Manhattan, New York, NY"],
  ["The RealReal", "The RealReal Chelsea, New York, NY"],
  ["The Shops at Hudson Yards", "The Shops at Hudson Yards, New York, NY"],
  ["Micro Center", "Micro Center, 71-43 Kissena Boulevard, Flushing, NY"],
  ["Eglance Bookstore", "Eglance Bookstore, 133-47 41st Avenue, Flushing, NY"],
  ["HiFi Records", "HiFi Records, 23-19 Steinway Street, Astoria, NY"],
  ["Q.E.D.", "Q.E.D. Astoria, 27-16 23rd Avenue, Astoria, NY"],
  ["Midtown Comics Times Square", "Midtown Comics Times Square, New York, NY"],
  ["Drama Book Shop", "Drama Book Shop, New York, NY"],
  ["Strand Times Square Kiosk", "Strand Book Store Times Square Kiosk, New York, NY"],
  ["New York Public Library Shop", "New York Public Library Shop, New York, NY"],
  ["Apple Grand Central", "Apple Grand Central, New York, NY"],
  ["Grand Central Market", "Grand Central Market, New York, NY"],
  ["Nintendo NY", "Nintendo NY, Rockefeller Center, New York, NY"],
  ["Tannen's Magic", "Tannen's Magic, New York, NY"],
  ["Radio City Music Hall", "Radio City Music Hall, New York, NY"],
  ["B&H Photo Video", "B&H Photo Video, 420 9th Avenue, New York, NY"],
  ["Adorama", "Adorama, 42 West 18th Street, New York, NY"],
  ["SPYSCAPE", "SPYSCAPE, 928 8th Avenue, New York, NY"],
  ["BrookLAN", "BrookLAN, Brooklyn, NY"],
  ["The Niche Shop", "The Niche Shop, Upper West Side, New York, NY"],
  ["Librairie du Met", "The Met Store, Metropolitan Museum of Art, New York, NY"],
  ["Aeon Bookstore", "Aeon Bookstore, 151 East Broadway, New York, NY"],
  ["InMotion", "InMotion JFK Terminal 5, Jamaica, NY"],
  ["iStore", "iStore JFK Terminal 8, Jamaica, NY"],
  ["Hot Beat Electronics", "Hot Beat Electronics, 166-05 Jamaica Avenue, Jamaica, NY"],
  ["LIC Bar", "LIC Bar, Long Island City, NY"],
  ["Debbie's", "Debbie's, 27-24 Jackson Avenue, Long Island City, NY"],
  ["Oculus", "Oculus, World Trade Center, New York, NY"],
  ["City Winery", "City Winery New York City"],
  ["Culture Lab LIC", "Culture Lab LIC, 5-25 46th Avenue, Long Island City, NY"],
  ["Gantry Plaza State Park", "Gantry Plaza State Park, Long Island City, NY"],
  ["Hunters Point South Park", "Hunters Point South Park, Long Island City, NY"],
  ["Bryant Park Picnic Performances", "Bryant Park Picnic Performances, Bryant Park, New York, NY"],
  ["Birdland Jazz Club", "Birdland Jazz Club, 315 West 44th Street, New York, NY"],
  ["Don't Tell Mama", "Don't Tell Mama, 343 West 46th Street, New York, NY"],
  ["Brookfield Place", "Brookfield Place, 230 Vesey Street, New York, NY"],
  ["The Rooftop at Pier 17", "The Rooftop at Pier 17, 89 South Street, New York, NY"],
  ["Fraunces Tavern", "Fraunces Tavern, 54 Pearl Street, New York, NY"],
  ["Bargemusic", "Bargemusic, Fulton Ferry Landing, Brooklyn, NY"],
  ["Time Out Market Rooftop", "Time Out Market Rooftop, 55 Water Street, Brooklyn, NY"],
  ["Superfine", "Superfine, 126 Front Street, Brooklyn, NY"],
  ["SummerStage Central Park", "SummerStage Central Park, Rumsey Playfield, New York, NY"],
  ["Jazz at Lincoln Center", "Jazz at Lincoln Center, Columbus Circle, New York, NY"],
  ["Beacon Theatre", "Beacon Theatre, 2124 Broadway, New York, NY"],
  ["Little Island Amph", "The Amph at Little Island, New York, NY"],
  ["Pier 57", "Pier 57, 25 11th Avenue, New York, NY"],
  ["Chelsea Music Hall", "Chelsea Music Hall, 407 West 15th Street, New York, NY"],
  ["The Standard Biergarten", "The Standard Biergarten, 848 Washington Street, New York, NY"],
  ["Bohemian Hall", "Bohemian Hall and Beer Garden, 29-19 24th Avenue, Astoria, NY"],
  ["The LetLove Inn", "The LetLove Inn, 27-20 23rd Avenue, Astoria, NY"],
  ["Terraza 7", "Terraza 7, 40-19 Gleane Street, Elmhurst, NY"],
  ["Queens Theatre", "Queens Theatre, Flushing Meadows Corona Park, Queens, NY"],
  ["Blue Note", "Blue Note Jazz Club, 131 West 3rd Street, New York, NY"],
  ["Cafe Wha?", "Cafe Wha?, 115 MacDougal Street, New York, NY"],
  ["Rockwood Music Hall", "Rockwood Music Hall, 196 Allen Street, New York, NY"],
  ["Bowery Ballroom", "Bowery Ballroom, 6 Delancey Street, New York, NY"],
  ["Madison Avenue", "Madison Avenue near Metropolitan Museum of Art, New York, NY"],
  ["Met", "The Metropolitan Museum of Art, New York, NY"],
  ["Lincoln Center", "Lincoln Center, New York, NY"],
  ["Best Buy LIC", "Best Buy Long Island City, Queens, NY"],
  ["8 Bit And Up", "8 Bit And Up Video Games, 86 East 3rd Street, New York, NY"],
  ["Forbidden Planet", "Forbidden Planet, 832 Broadway, New York, NY"],
  ["Steinway Hall", "Steinway Hall, 1133 Avenue of the Americas, New York, NY"],
  ["Faust Harrison Pianos", "Faust Harrison Pianos, 207 West 58th Street, New York, NY"],
  ["Klavierhaus", "Klavierhaus, 549 West 52nd Street, New York, NY"],
  ["Beethoven Pianos", "Beethoven Pianos, Astoria, NY"],
  ["Bryant Park Piano", "Bryant Park Piano, Upper Terrace, Bryant Park, New York, NY"],
  ["Sing for Hope Pianos", "Sing for Hope Pianos, New York, NY"],
  ["Spy Shop NY", "Spy Shop NY, New York, NY"],
  ["JD Sports Times Square", "JD Sports Times Square, 1466 Broadway, New York, NY"],
  ["Nike House of Innovation", "Nike House of Innovation, 650 5th Avenue, New York, NY"],
  ["Black Tap", "Black Tap Craft Burgers and Beer Midtown, New York, NY"],
  ["Lady M Bryant Park", "Lady M Bryant Park, New York, NY"],
  ["tm:rw", "tm:rw Times Square, New York, NY"],
  ["OS NYC", "OS NYC, 50 Bowery, New York, NY"],
  ["Chinatown Fair", "Chinatown Fair Family Fun Center, 8 Mott Street, New York, NY"],
  ["Up One SoHo", "Up One SoHo, 474 Broadway, New York, NY"],
  ["Up One Flushing", "Up One Flushing, 136-17 39th Avenue, Flushing, NY"],
  ["Kitsby", "Kitsby Studio, 393 Broadway, New York, NY"],
  ["Area 53 DUMBO", "Area 53 DUMBO, 53 Bridge Street, Brooklyn, NY"],
  ["VRBar", "VRBar, 65 Jay Street, Brooklyn, NY"],
  ["3rd Place From the Sun", "3rd Place From the Sun, DUMBO, Brooklyn, NY"],
  ["Teen Tech Center", "Brooklyn Public Library Teen Tech Center, 1 John Street, Brooklyn, NY"],
  ["Van Leeuwen DUMBO", "Van Leeuwen Ice Cream DUMBO, 1 Water Street, Brooklyn, NY"],
  ["Hex&Co. West Side", "Hex&Co West Side, 2911 Broadway, New York, NY"],
  ["Hex&Co. Upper East Side", "Hex&Co Upper East Side, 1462 1st Avenue, New York, NY"],
  ["Hex&Co. Union Square", "Hex&Co Union Square, 801 Broadway, New York, NY"],
  ["16 Handles UWS", "16 Handles Upper West Side, 325 Amsterdam Avenue, New York, NY"],
  ["Mochi Dolci", "Mochi Dolci, Upper West Side, New York, NY"],
  ["Barcade Chelsea", "Barcade Chelsea, New York, NY"],
  ["Google Store Chelsea", "Google Store Chelsea, 76 9th Avenue, New York, NY"],
  ["Doughnuttery", "Doughnuttery Chelsea Market, New York, NY"],
  ["L'Arte del Gelato", "L'Arte del Gelato Chelsea Market, New York, NY"],
  ["Pier 57 Rooftop", "Pier 57 Rooftop Park, New York, NY"],
  ["Gaming City", "Gaming City USA, 36-10 31st Street, Astoria, NY"],
  ["Gaming Dojo", "Gaming Dojo, 36-29 Main Street, Flushing, NY"],
  ["Quackade", "Quackade, 44-47 23rd Street, Long Island City, NY"],
  ["Control", "Control Synthesizers and Electronic Devices, 67 West Street, Brooklyn, NY"],
  ["Micro Center", "Micro Center, 71-43 Kissena Boulevard, Flushing, NY"],
  ["Midtown Comics Times Square", "Midtown Comics Times Square, New York, NY"],
  ["Drama Book Shop", "Drama Book Shop, New York, NY"],
  ["Kinokuniya", "Kinokuniya New York, 1073 Avenue of the Americas, New York, NY"],
  ["Nintendo NY", "Nintendo NY, Rockefeller Center, New York, NY"],
  ["Apple Grand Central", "Apple Grand Central, New York, NY"],
  ["SPYSCAPE", "SPYSCAPE, 928 8th Avenue, New York, NY"],
  ["Tannen's Magic", "Tannen's Magic, New York, NY"],
  ["B&H Photo Video", "B&H Photo Video, 420 9th Avenue, New York, NY"],
  ["Adorama", "Adorama, 42 West 18th Street, New York, NY"],
  ["Mercer Labs", "Mercer Labs, 21 Dey Street, New York, NY"],
  ["Holographic Studios", "Holographic Studios, 172 East 2nd Street, New York, NY"],
  ["Spy Shop NY", "Spy Shop NY, New York, NY"],
  ["Art of Play", "Art of Play, 69 Atlantic Avenue, Brooklyn, NY"],
  ["8 Bit And Up", "8 Bit And Up Video Games, 86 East 3rd Street, New York, NY"],
  ["Forbidden Planet", "Forbidden Planet, 832 Broadway, New York, NY"],
  ["Spot Dessert Bar", "Spot Dessert Bar Flushing, Queens, NY"],
  ["Gong Gan", "Gong Gan Flushing, Queens, NY"],
  ["Mercer Labs", "Mercer Labs, 21 Dey Street, New York, NY"],
  ["Museum of Ice Cream", "Museum of Ice Cream, 558 Broadway, New York, NY"],
  ["Color Factory", "Color Factory NYC, 251 Spring Street, New York, NY"],
  ["Edge", "Edge, 30 Hudson Yards, New York, NY"],
];

const teenInterestsBySite = new Map<string, TeenInterestPick>([
  ["hotel", { text: "Depuis l'hôtel : Quackade pour arcade/VR à LIC, ou Gaming City à Astoria si on veut une vraie salle de jeux." }],
  ["fireworks", { text: "Avant/après le feu : Quackade si on reste côté LIC, sinon simple mission photo skyline + snack." }],
  ["gantry", { text: "Gantry marche bien en mode photo challenge ; Quackade est le bonus arcade le plus proche." }],
  ["times-square", { text: "Times Square : Midtown Comics pour manga/comics, tm:rw pour simu/VR, Black Tap pour milkshake XXL ; Sing for Hope Pianos 2026 est terminé mais visible en calque archive." }],
  ["bryant", { text: "Bryant : Kinokuniya pour manga/papeterie japonaise, Nintendo NY pour merch/gaming ; Bryant Park Piano est surtout un concert à écouter." }],
  ["library", { text: "Après la NYPL : Kinokuniya pour manga + papeterie, Lady M pour dessert, Nintendo NY si l'énergie gaming remonte." }],
  ["grand-central", { text: "Grand Central se combine bien avec Nintendo NY ou Midtown Comics ; Sing for Hope Pianos 2026 est terminé mais le calque montre les emplacements officiels." }],
  ["rockefeller", { text: "Nintendo NY est le stop ado évident ; Midtown Comics Times Square n'est pas loin si l'envie comics/manga prend le dessus." }],
  ["top-rock", { text: "Après la vue : Nintendo NY pour merch/gaming, Midtown Comics pour pop culture, Black Tap pour dessert XXL." }],
  ["liberty", { text: "Après ferry Downtown : Mercer Labs pour expérience immersive très visuelle, ou Brookfield Place pour pause food/photo." }],
  ["ellis", { text: "Après Ellis Island : Mercer Labs si on veut du spectaculaire indoor proche WTC sans changer de zone." }],
  ["wall-street", { text: "Wall Street + WTC : Mercer Labs pour immersif, SPYSCAPE pour mission espionnage, ou OS NYC en remontant vers Chinatown pour gaming." }],
  ["oculus", { text: "Depuis Oculus : Mercer Labs est le meilleur choix immersif ; SPYSCAPE marche si on veut défis, profil d'espion et côté jeu." }],
  ["memorial911", { text: "Après le Memorial : rester calme ; Mercer Labs seulement si tout le monde veut repartir sur du visuel/immersif Downtown." }],
  ["brooklyn-bridge", { text: "Côté Brooklyn : Area 53 DUMBO pour laser tag/mini bowling, VRBar pour réalité virtuelle." }],
  ["dumbo", { text: "DUMBO : Area 53 DUMBO, VRBar ou 3rd Place From the Sun selon arcade, VR ou jeux de société." }],
  ["carousel", { text: "Après Jane's Carousel : Van Leeuwen DUMBO pour glace, puis Area 53 DUMBO si on veut bouger." }],
  ["bbpark", { text: "Brooklyn Bridge Park : Van Leeuwen DUMBO pour dessert, Teen Tech Center si ouvert et adapté aux 13-18." }],
  ["central-park", { text: "Côté UWS : Hex&Co. West Side pour jeux/D&D, 16 Handles UWS pour dessert ; le calque Sing for Hope montre l'archive 2026, plus jouable après le 7 juin." }],
  ["bethesda", { text: "Après Bethesda : 16 Handles UWS pour frozen yogurt, Hex&Co. West Side pour jeux ; les pianos Sing for Hope 2026 sont une archive, pas un plan actif." }],
  ["amnh", { text: "AMNH + Hex&Co. West Side marche bien pour jeux ; 16 Handles UWS pour dessert ; Sing for Hope 2026 est terminé mais visible sur la carte." }],
  ["met", { text: "Après le Met : Hex&Co. Upper East Side pour jeux ; pour piano, le calque Sing for Hope sert surtout d'archive officielle 2026." }],
  ["hudson-yards", { text: "Hudson Yards : Edge pour sensation forte, Google Store Chelsea pour tech, B&H Photo Video si quelqu'un veut voir un énorme magasin photo/vidéo." }],
  ["vessel", { text: "Vessel + Edge pour photos/hauteur ; Google Store Chelsea pour gadgets, B&H Photo Video si le mood devient tech/photo." }],
  ["high-line", { text: "High Line : Pier 57 Rooftop pour vue gratuite, Barcade Chelsea pour arcade rétro, Adorama si on veut jeter un oeil gear/photo." }],
  ["chelsea-market", { text: "Chelsea Market : Doughnuttery ou L'Arte del Gelato pour dessert, Barcade Chelsea pour jouer ; B&H n'est pas loin pour les fans de gear." }],
  ["little-island", { text: "Little Island : Pier 57 Rooftop pour vue, Barcade Chelsea si besoin d'arcade, Google Store Chelsea pour une pause gadgets." }],
  ["moma-ps1", { text: "Après PS1 : Quackade pour arcade/VR à LIC, Gaming City à Astoria ; Control si le côté synthés/modulaire intrigue aussi les ados." }],
  ["flushing", { text: "Flushing : Gaming Dojo pour PC/esport, Up One Flushing pour collectibles/claw machines, Micro Center pour hardware, puis Spot Dessert Bar." }],
  ["astoria", { text: "Astoria : Gaming City pour arcade, Quackade côté LIC si on veut VR/claw machines ; Beethoven Pianos est plutôt showroom." }],
  ["soho", { text: "SoHo : Up One SoHo pour claw machines/collectibles, Museum of Ice Cream pour photo/dessert, Forbidden Planet tout près si comics/manga." }],
  ["chinatown", { text: "Chinatown : Chinatown Fair pour arcade old-school, OS NYC pour gaming lounge, puis bubble tea/snacks autour." }],
  ["little-italy", { text: "Little Italy : Up One SoHo ou Kitsby à quelques minutes, puis gelato/dessert dans le quartier." }],
  ["washington-square", { text: "Washington Square : Hex&Co. Union Square pour jeux, Color Factory / Museum of Ice Cream vers SoHo, ou piano de rue si un musicien est autour de l'arche." }],
  ["airport", { text: "Dernier jour : pas de détour. InMotion / iStore au terminal pour écouteurs, chargeur ou accessoire de dernière minute." }],
]);

const musicVenuesByArea = new Map<string, MusicVenuePick>([
  [
    "lic",
    {
      text: "LIC Bar et Debbie's pour un concert local simple le soir ; Culture Lab LIC et Gantry Plaza State Park publient souvent des concerts/événements gratuits en saison.",
    },
  ],
  [
    "midtown",
    {
      text: "Bryant Park Picnic Performances pour concert public gratuit en été ; Birdland Jazz Club ou Don't Tell Mama pour jazz/cabaret, Radio City Music Hall pour gros show.",
    },
  ],
  [
    "downtown",
    {
      text: "Brookfield Place programme des concerts gratuits en intérieur/extérieur ; The Rooftop at Pier 17 pour live avec vue, Fraunces Tavern pour pub historique.",
    },
  ],
  [
    "brooklyn",
    {
      text: "Bargemusic pour classique sur une péniche, St. Ann's Warehouse pour scène contemporaine, Time Out Market Rooftop ou Superfine pour verre avec ambiance DUMBO.",
    },
  ],
  [
    "central",
    {
      text: "SummerStage Central Park est la grande option concert public ; Lincoln Center et Jazz at Lincoln Center pour musique plus posée, Beacon Theatre côté Upper West Side.",
    },
  ],
  [
    "chelsea",
    {
      text: "Little Island Amph pour concerts publics si la programmation colle ; Pier 57 pour terrasse/ambiance, City Winery ou Chelsea Music Hall pour live, The Standard Biergarten pour verre.",
    },
  ],
  [
    "queens",
    {
      text: "Bohemian Hall pour beer garden à Astoria, The LetLove Inn pour petit bar musical, Culture Lab LIC pour concerts Queens, Terraza 7 si on accepte un détour jazz/latin vers Jackson Heights.",
    },
  ],
  [
    "soho-village",
    {
      text: "Washington Square pour musique de rue, Blue Note ou Cafe Wha? pour live mythique Greenwich Village, Rockwood Music Hall ou Bowery Ballroom pour concerts plus indie.",
    },
  ],
  [
    "jfk",
    {
      text: "Dernier jour : pas de détour. Garder les bars/restaurants du terminal et éviter tout plan concert avant le vol.",
    },
  ],
]);

const singForHopePianos2026: PianoMapPoint[] = [
  { number: 1, title: "Play With Heart", site: "Little Island", lat: 40.741961, lng: -74.010338 },
  { number: 2, title: "We Are The People", site: "Castle Clinton", lat: 40.7036391, lng: -74.0167208 },
  { number: 3, title: "Aladdin", site: "Sherman Square - Broadway Malls", lat: 40.7773324, lng: -73.9823614 },
  { number: 4, title: "The Lion King", site: "Central Park - The Dairy", lat: 40.7691158, lng: -73.9736962 },
  { number: 5, title: "Live Your Highest You", site: "West Harlem Piers", lat: 40.8208, lng: -73.9594 },
  { number: 6, title: "Birds of New York", site: "Union Square", lat: 40.7348815, lng: -73.9901371 },
  { number: 7, title: "LOUDER!", site: "Farley Steps", lat: 40.7510385, lng: -73.9943995 },
  { number: 8, title: "Born To Shine", site: "Fort Tryon", lat: 40.8613831, lng: -73.9336397 },
  { number: 9, title: "Urban Rhythms", site: "Washington Market Park", lat: 40.7168483, lng: -74.0114882 },
  { number: 10, title: "Phoenix Garden of Hope", site: "John Jay", lat: 40.7692557, lng: -73.9496572 },
  { number: 11, title: "Starry Symphony", site: "Haven Plaza", lat: 40.8426697, lng: -73.9430275 },
  { number: 12, title: "Let Hope Bloom", site: "Greeley Square", lat: 40.7475, lng: -73.9876 },
  { number: 13, title: "I Am Not Broken", site: "Cadman Plaza", lat: 40.6970151, lng: -73.9907504 },
  { number: 14, title: "Stories In The Making", site: "Prospect Park Grand Army Plaza", lat: 40.6728875, lng: -73.9697644 },
  { number: 15, title: "Echoes of Dancheong", site: "Old Stone House / Washington Park", lat: 40.6729873, lng: -73.9844375 },
  { number: 16, title: "Monarchs and Milkweed", site: "Bushwick Inlet Park", lat: 40.7230353, lng: -73.959048 },
  { number: 17, title: "We Are HOPE", site: "Msgr McGorlick Park", lat: 40.7245581, lng: -73.9427807 },
  { number: 18, title: "Artbeat", site: "Marine Park", lat: 40.6077754, lng: -73.9371715 },
  { number: 19, title: "Music Heals Us", site: "Astoria Park", lat: 40.7760022, lng: -73.9252065 },
  { number: 20, title: "Bodega Cats", site: "Queens County Farm Museum", lat: 40.748096, lng: -73.720042 },
  { number: 21, title: "The Music Between Us", site: "Forest Park Overlook", lat: 40.7098858, lng: -73.8354374 },
  { number: 22, title: "Daily Chhapa", site: "Van Cortlandt House Museum", lat: 40.891128, lng: -73.8948416 },
  { number: 23, title: "Convergence", site: "Williamsbridge Oval", lat: 40.8766416, lng: -73.8787473 },
  { number: 24, title: "Mother Nature", site: "Poe Park", lat: 40.8642621, lng: -73.8949455 },
  { number: 25, title: "Be You!", site: "Greenbelt Nature Center", lat: 40.5883436, lng: -74.1389471 },
];

const secretCuriositiesBySite = new Map<string, SecretCuriosity>([
  ["hotel", { title: "Sous le Queensboro Bridge", text: "Long Island City garde des morceaux industriels discrets : sous les voies et autour de Queens Plaza, on voit encore le New York des ateliers et entrepôts derrière les tours neuves." }],
  ["fireworks", { title: "Le spot secret change chaque année", text: "Le feu du 4 juillet peut basculer entre East River et Hudson selon l'édition. Le vrai réflexe new-yorkais est de vérifier la carte officielle avant de choisir son point de vue." }],
  ["gantry", { title: "Des grues de 100 tonnes pour trains flottants", text: "Les gantries de 1925 transféraient des wagons entiers vers des barges ferroviaires. Le parc conserve donc une vraie machine logistique de l'ancien port industriel." }],
  ["times-square", { title: "Un ancien quartier de théâtres plus sombre", text: "Times Square s'appelait Longacre Square avant le New York Times. Derrière les écrans LED, l'histoire du lieu passe par journaux, théâtres, peep-shows et rénovation géante." }],
  ["bryant", { title: "Des livres sous le parc", text: "Sous Bryant Park se cache une extension des stacks de la NYPL. Le parc recouvre une partie du système qui porte des dizaines de miles d'étagères de livres." }],
  ["library", { title: "Le vieux réservoir dans la bibliothèque", text: "La NYPL a été construite sur le site du Croton Reservoir. Untapped New York rappelle qu'on peut encore voir des traces de cette ancienne infrastructure dans certains espaces du bâtiment." }],
  ["grand-central", { title: "Tennis, tunnels et escaliers cachés", text: "Grand Central ne se limite pas à la Whispering Gallery : le terminal cache aussi un court de tennis, d'immenses sous-sols et même un escalier secret dans le kiosque d'information." }],
  ["rockefeller", { title: "Des jardins suspendus invisibles", text: "Au-dessus du Rockefeller Center, des rooftop gardens privés forment une petite ville art-déco au-dessus de la ville, presque impossible à deviner depuis la rue." }],
  ["top-rock", { title: "Le meilleur angle n'est pas forcément au centre", text: "Depuis Top of the Rock, l'intérêt secret est d'avoir l'Empire State Building dans l'axe. C'est souvent plus photogénique que d'être au plus haut possible." }],
  ["liberty", { title: "Une statue posée dans un fort étoilé", text: "Le piédestal de la Statue est construit à l'intérieur de Fort Wood, un ancien fort en étoile à onze branches. Et la torche originale se trouve désormais dans le musée." }],
  ["ellis", { title: "Un hôpital abandonné sur l'île", text: "La face la moins connue d'Ellis Island est son ancien complexe hospitalier, longtemps fermé au public : une autre histoire de l'immigration, plus fragile et médicale." }],
  ["wall-street", { title: "Le mur, mais aussi le marché aux esclaves", text: "Wall Street vient bien du mur hollandais, mais l'histoire cachée est plus sombre : la zone a aussi accueilli un marché aux esclaves au XVIIIe siècle." }],
  ["oculus", { title: "Des traces de l'ancien World Trade Center", text: "Autour de l'Oculus et du nouveau hub, certains fragments et alignements rappellent encore l'ancien World Trade Center, comme une couche d'histoire sous l'architecture blanche." }],
  ["memorial911", { title: "Les plus grandes cascades artificielles d'Amérique du Nord", text: "Les bassins du 9/11 Memorial ne sont pas seulement symboliques : ils comptent parmi les plus grandes cascades artificielles d'Amérique du Nord." }],
  ["brooklyn-bridge", { title: "Des caves à champagne dans les ancrages", text: "Les voûtes du Brooklyn Bridge ont servi de caves à vin et champagne. Les loyers aidaient à financer le pont, et certaines marques peintes y auraient longtemps subsisté." }],
  ["dumbo", { title: "Un nom inventé pour décourager les promoteurs", text: "DUMBO signifie Down Under the Manhattan Bridge Overpass. Le nom aurait été choisi en partie parce qu'il sonnait peu glamour, pour protéger le quartier industriel." }],
  ["carousel", { title: "Un carrousel sauvé d'un autre État", text: "Jane's Carousel date de 1922 et vient d'Ohio. Il a été restauré pendant des années avant d'arriver dans son écrin de verre à Brooklyn." }],
  ["bbpark", { title: "Des quais transformés en parc", text: "Brooklyn Bridge Park n'est pas un parc naturel : ce sont d'anciens piers industriels reconvertis, avec une écologie recréée au bord de l'East River." }],
  ["central-park", { title: "Seneca Village, le village effacé", text: "Avant Central Park, Seneca Village était une communauté de propriétaires noirs et immigrés. La ville l'a expropriée en 1857 pour créer le parc." }],
  ["bethesda", { title: "Des tuiles sous l'arche", text: "Le plafond de l'arcade Bethesda est en tuiles Minton, un détail décoratif rare à New York et souvent plus impressionnant que la fontaine elle-même." }],
  ["amnh", { title: "La baleine bleue flotte vraiment", text: "La célèbre baleine bleue est suspendue dans le Hall of Ocean Life. Son modèle date d'une époque où les scientifiques corrigeaient encore sa forme réelle." }],
  ["met", { title: "Un temple égyptien sauvé des eaux", text: "Le Temple of Dendur a été offert aux États-Unis après le sauvetage des monuments menacés par le barrage d'Assouan." }],
  ["hudson-yards", { title: "Une ville au-dessus des trains", text: "Hudson Yards est construit au-dessus d'un immense faisceau ferroviaire actif. Une grande partie du quartier repose sur une plateforme." }],
  ["vessel", { title: "Un monument devenu controversé", text: "Vessel devait être une sculpture urbaine ouverte. Son accès a été fortement restreint après plusieurs drames, ce qui change complètement son usage." }],
  ["high-line", { title: "La voie ferrée passait dans les usines", text: "L'ancienne ligne de fret traversait directement des bâtiments, dont le complexe Nabisco. La High Line était une infrastructure logistique avant d'être un parc suspendu." }],
  ["chelsea-market", { title: "L'Oreo est né ici", text: "Chelsea Market occupe l'ancien complexe Nabisco. L'Oreo y a été inventé en 1912, quand le bâtiment était encore une usine géante de biscuits." }],
  ["little-island", { title: "Pier 54 sous les tulipes", text: "Little Island est posé sur des piliers en forme de tulipes, mais aussi sur l'histoire des anciens piers Cunard : le Carpathia y a débarqué des survivants du Titanic." }],
  ["moma-ps1", { title: "L'école du maire Battle Axe", text: "MoMA PS1 occupe une ancienne école de 1892 liée à Patrick 'Battle Axe' Gleason, dernier maire haut en couleur de Long Island City avant l'intégration à NYC." }],
  ["flushing", { title: "Une autre capitale asiatique de New York", text: "Flushing est parfois plus dense et plus varié que Chinatown Manhattan : chinois, coréen, taïwanais, food courts et galeries commerciales s'empilent autour de Main Street." }],
  ["astoria", { title: "Hollywood avant Hollywood, côté Queens", text: "Astoria a été un grand quartier de studios. Kaufman Astoria Studios perpétue cette histoire cinéma/télé, loin des circuits touristiques classiques." }],
  ["soho", { title: "Les façades sont en fonte", text: "Les immeubles cast-iron de SoHo semblent en pierre, mais beaucoup sont des façades de fonte moulée : industriel, décoratif et très new-yorkais." }],
  ["chinatown", { title: "Le tunnel de Doyers Street", text: "Doyers Street, le Bloody Angle, aurait eu un tunnel de sortie vers Chatham Square. Untapped New York décrit encore une partie de ce passage caché dans Chinatown." }],
  ["little-italy", { title: "Un quartier devenu symbole", text: "Little Italy était beaucoup plus vaste autrefois. Aujourd'hui, Mulberry Street concentre surtout une mémoire et une mise en scène de l'ancien quartier italien." }],
  ["washington-square", { title: "Potter's field sous les musiciens", text: "Avant les étudiants, les joueurs d'échecs et les musiciens, Washington Square fut un potter's field. Des milliers de sépultures reposeraient encore sous le parc." }],
  ["airport", { title: "Idlewild avant JFK", text: "L'aéroport JFK s'appelait Idlewild avant d'être renommé en 1963. Le nom original venait d'un ancien terrain de golf du secteur." }],
]);
const dayBySiteId = buildDayBySiteId();

let currentFilter: Filter = "Tous";
let currentSearch = "";
let imageObserver: IntersectionObserver | null = null;
const observedImages = new WeakSet<HTMLImageElement>();
const commonsImageRequests = new Map<string, Promise<CommonsImage[]>>();
let tripMap: L.Map | null = null;
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Impossible de trouver le conteneur #app.");
}

app.innerHTML = `
  <header class="hero is-loading-image" data-hero-image data-image-query="${escapeHtml(heroImageQuery)}" data-fallback-image="${heroImage}">
    <div class="hero-content">
      <p class="eyebrow">Planning familial interactif · 4 → 12 juillet 2026</p>
      <h1>New York en famille</h1>
      <p>Carte, planning et fiches pratiques pour vivre New York sans se disperser.</p>
      <div class="hero-actions">
        <a class="btn" href="#carte">Voir la carte</a>
        <a class="btn" href="#planning">Voir le planning</a>
        <a class="btn secondary" href="#details">Explorer les fiches</a>
        <button class="btn install-button" type="button" data-install-app>Ajouter au téléphone</button>
      </div>
    </div>
  </header>
  <main class="wrap">
    <section class="notice">
      <div><strong>Base :</strong> Wingate Long Island City, près de <strong>21 St-Queensbridge</strong> et <strong>Queensboro Plaza</strong>.</div>
      <div class="tip">Rythme conseillé : départ 9 h-9 h 30, vraie pause déjeuner, retour hôtel si chaleur ou fatigue.</div>
    </section>
    <section class="stats" aria-label="Résumé du voyage">
      <div class="stat"><b>${days.length}</b><span>jours sur place</span></div>
      <div class="stat"><b>${sites.length}</b><span>fiches destinations</span></div>
      <div class="stat"><b>${sites.filter((site) => site.category === "Musée").length}</b><span>musées possibles</span></div>
      <div class="stat"><b>${sites.filter((site) => site.borough === "Queens").length}</b><span>idées dans Queens</span></div>
    </section>
    <section class="map-intro" id="carte">
      <div class="section-title">
        <div>
          <h2>Carte interactive des visites</h2>
          <p>Carte dynamique avec marqueurs par jour, métro, bus/tram, pianos Sing for Hope 2026 et mode plein écran.</p>
        </div>
      </div>
      <div class="map-layout">
        <div class="map-shell" id="mapShell">
          <button class="map-maximize-button" type="button" data-map-maximize aria-expanded="false" aria-controls="leafletMap">
            Agrandir la carte
          </button>
          <div class="ny-map" id="leafletMap" aria-label="Carte Leaflet interactive de New York">
          </div>
        </div>
        <div class="map-list">
          <b>Numéros sur la carte</b>
          <div class="day-legend">
            ${days.map(renderDayLegendItem).join("")}
          </div>
          <div class="map-activities">
            ${days.map(renderMapActivityDay).join("")}
          </div>
          <p class="map-credit">Carte dynamique : <a href="https://leafletjs.com/" target="_blank" rel="noreferrer">Leaflet</a> + <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>. Le calque <a href="https://www.singforhope.org/pianos/nyc26" target="_blank" rel="noreferrer">Sing for Hope Pianos NYC 2026</a> est officiel mais archivé : public du 18 mai au 7 juin 2026.</p>
        </div>
      </div>
    </section>
    <section id="planning">
      <div class="section-title">
        <div>
          <h2>Planning jour par jour</h2>
          <p>Chaque journée est générée depuis des données TypeScript : modifiez les tableaux dans <code>src/app.ts</code> pour changer le voyage.</p>
        </div>
      </div>
      <div class="itinerary-grid">${days.map(renderDay).join("")}</div>
    </section>
    <section id="details">
      <div class="section-title">
        <div>
          <h2>Fiches détaillées</h2>
          <p>Filtrez par zone ou par type de visite. Les photos sont cherchées dynamiquement sur Wikimedia Commons et gardées en cache local.</p>
        </div>
      </div>
      <div class="toolbar">
        <input class="search" id="search" type="search" placeholder="Rechercher une destination, un quartier, une idée..." aria-label="Rechercher une destination" />
        <div class="filters">${filters.map(renderFilter).join("")}</div>
      </div>
      <div class="empty-state" id="empty-state">Aucune destination ne correspond à cette recherche.</div>
      <div class="details" id="site-list"></div>
    </section>
    <section class="metro">
      <h2>Lignes à retenir</h2>
      <div class="chips">
        <span class="chip">7 : Queens ↔ Grand Central / Times Sq / Hudson Yards</span>
        <span class="chip">F : Queensbridge ↔ Midtown / Downtown</span>
        <span class="chip">N/W : Queensboro Plaza ↔ Midtown</span>
        <span class="chip">4/5/6 : axe Est de Manhattan</span>
        <span class="chip">R/W : accès Bowling Green / Whitehall</span>
      </div>
    </section>
  </main>
  <footer class="footer">Planning familial interactif — New York, juillet 2026</footer>
  <div class="install-help" id="installHelp" aria-hidden="true" role="dialog" aria-label="Ajouter l'application au téléphone">
    <div class="install-help-card">
      <button class="install-help-close" type="button" aria-label="Fermer l'aide d'installation">×</button>
      <h2>Ajouter au téléphone</h2>
      <p><b>iPhone Safari :</b> touche le bouton Partager, puis <b>Sur l'écran d'accueil</b>.</p>
      <p><b>Android Chrome :</b> ouvre le menu ⋮, puis <b>Ajouter à l'écran d'accueil</b> si le bouton ne lance pas l'installation automatiquement.</p>
    </div>
  </div>
  <div class="image-lightbox" id="imageLightbox" aria-hidden="true" role="dialog" aria-label="Photo en plein écran">
    <button class="image-lightbox-close" type="button" aria-label="Fermer la photo">×</button>
    <img src="" alt="">
    <p></p>
  </div>
`;

renderSites();
registerServiceWorker();
bindInteractions();
bindImageFallbacks();
hydrateDynamicImages();
hydrateHeroImage();
initLeafletMap();

function renderDay(day: DayPlan, index: number): string {
  const routeLinkDetails = getDayRouteLinkDetails(day);
  const routeLink = routeLinkDetails
    ? `<a class="route-link" href="${routeLinkDetails.url}" target="_blank" rel="noreferrer" data-current-route-site-id="${routeLinkDetails.siteId}">${escapeHtml(routeLinkDetails.label)}</a>`
    : "";
  const links = day.siteIds
    .map((siteId) => siteById.get(siteId))
    .filter((site): site is Site => Boolean(site))
    .map((site) => `<a class="pill-link" href="#${site.id}">${escapeHtml(site.title)}</a>`)
    .join("");

  return `
    <article class="day itinerary-card ${day.layout ?? ""}" id="${day.id}" style="--day-color: ${getDayColor(index)}">
      <div class="day-media">
        ${renderDynamicImage({
          alt: day.title,
          fallbackImage: getDayFallbackImage(day),
          query: getDayImageQuery(day),
          slot: 0,
        })}
      </div>
      <div class="content">
        <div class="day-heading">
          <span class="day-number">${index + 1}</span>
          <div>
            <span class="date">${escapeHtml(day.date)}</span>
            <h3>${escapeHtml(day.title)}</h3>
          </div>
        </div>
        <p>${escapeHtml(day.summary)}</p>
        <div class="route">
          <span><b>Trajet :</b> ${escapeHtml(day.route)}</span>
          ${routeLink}
        </div>
        <div class="links">${links}</div>
      </div>
    </article>
  `;
}

function getDayRouteTarget(day: DayPlan): (Site & { map: MapPoint }) | undefined {
  return day.siteIds
    .map((siteId) => siteById.get(siteId))
    .find((site): site is Site & { map: MapPoint } => Boolean(site && site.id !== "hotel" && site.map));
}

function getDayRouteLinkDetails(day: DayPlan): { label: string; siteId: string; url: string } | undefined {
  if (day.id === "day-4") {
    const hotel = siteById.get("hotel");

    if (!hotel) {
      return undefined;
    }

    return {
      label: "Google Maps vers l'hôtel",
      siteId: hotel.id,
      url: buildGoogleMapsCurrentLocationRouteUrl(hotel),
    };
  }

  const routeTarget = getDayRouteTarget(day);

  if (!routeTarget) {
    return undefined;
  }

  return {
    label: `Google Maps vers ${routeTarget.title}`,
    siteId: routeTarget.id,
    url: buildGoogleMapsCurrentLocationRouteUrl(routeTarget),
  };
}

function buildGoogleMapsCurrentLocationRouteUrl(site: Site, origin?: GeolocationCoordinates): string {
  const params = new URLSearchParams({
    api: "1",
    destination: getGoogleMapsDestination(site),
  });

  if (origin) {
    params.set("origin", `${origin.latitude},${origin.longitude}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function getGoogleMapsDestination(site: Site): string {
  if (site.map) {
    return `${site.map.lat},${site.map.lng}`;
  }

  return `${site.title}, ${site.borough}, New York`;
}

function renderFilter(filter: Filter): string {
  const activeClass = filter === currentFilter ? " is-active" : "";
  return `<button class="filter${activeClass}" type="button" data-filter="${filter}">${filter}</button>`;
}

function renderDayLegendItem(day: DayPlan, index: number): string {
  return `
    <span class="day-legend-item">
      <i style="--day-color: ${getDayColor(index)}"></i>
      ${escapeHtml(day.date.replace(/ juillet$/, ""))}
    </span>
  `;
}

function renderMapActivityDay(day: DayPlan, index: number): string {
  const mappedSites = day.siteIds
    .map((siteId) => siteById.get(siteId))
    .filter((site): site is Site & { map: MapPoint } => Boolean(site?.map));

  if (mappedSites.length === 0) {
    return "";
  }

  return `
    <section class="map-activity-day" style="--day-color: ${getDayColor(index)}">
      <h3>${escapeHtml(day.date)} <span>${escapeHtml(day.title)}</span></h3>
      ${mappedSites.map((site) => renderMapActivityLink(site)).join("")}
    </section>
  `;
}

function renderMapActivityLink(site: Site & { map: MapPoint }): string {
  return `
    <a class="map-activity-link" href="#${site.id}">
      <span class="map-activity-number">${escapeHtml(site.map.label)}</span>
      <span class="map-activity-copy">
        <strong>${escapeHtml(site.title)}</strong>
        <small>${site.category} · ${site.duration}</small>
      </span>
    </a>
  `;
}

function initLeafletMap(): void {
  const mapElement = document.querySelector<HTMLDivElement>("#leafletMap");
  const mappedSites = sites.filter((site): site is Site & { map: MapPoint } => Boolean(site.map));
  const shouldCollapseLayers = window.matchMedia("(max-width: 640px)").matches;

  if (!mapElement || mappedSites.length === 0) {
    return;
  }

  tripMap?.remove();
  tripMap = L.map(mapElement, {
    center: [40.741, -73.976],
    zoom: 12,
    scrollWheelZoom: true,
    touchZoom: true,
    dragging: true,
    boxZoom: true,
    doubleClickZoom: true,
    maxBounds: L.latLngBounds([40.55, -74.2], [40.92, -73.68]),
    maxBoundsViscosity: 0.55,
  });

  const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  });

  const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  );

  const subwayLayer = createUsefulSubwayLayer();

  const busTramLayer = createUsefulBusTramLayer();

  const pianoLayer = createSingForHopePianosLayer();

  osmLayer.addTo(tripMap);
  L.control
    .layers(
      {
        OpenStreetMap: osmLayer,
        Satellite: satelliteLayer,
      },
      {
        "Lignes de métro utiles": subwayLayer,
        "Bus / tram utiles": busTramLayer,
        "Sing for Hope Pianos 2026": pianoLayer,
      },
      {
        collapsed: shouldCollapseLayers,
        position: "bottomright",
      },
    )
    .addTo(tripMap);
  L.control.scale({ imperial: false, maxWidth: 160, position: "bottomleft" }).addTo(tripMap);

  const markers = mappedSites.map((site) => {
    const marker = L.marker([site.map.lat, site.map.lng], {
      icon: createMapIcon(site),
      title: site.title,
    }).bindPopup(renderMapPopup(site));

    marker.on("click", (event) => {
      if (isMapMaximized()) {
        L.DomEvent.stop(event.originalEvent);
        goToSiteFromMap(site.id);
        return;
      }

      markActiveSite(site.id);
    });
    marker.addTo(tripMap as L.Map);
    return marker;
  });

  const markerGroup = L.featureGroup(markers);
  tripMap.fitBounds(markerGroup.getBounds(), {
    padding: [32, 32],
    maxZoom: 12,
  });

  setTimeout(() => tripMap?.invalidateSize(), 0);
}

function toggleMapMaximized(shouldMaximize?: boolean): void {
  const mapShell = document.querySelector<HTMLDivElement>("#mapShell");
  const button = document.querySelector<HTMLButtonElement>("[data-map-maximize]");

  if (!mapShell || !button) {
    return;
  }

  const isMaximized = shouldMaximize ?? !mapShell.classList.contains("is-map-maximized");

  mapShell.classList.toggle("is-map-maximized", isMaximized);
  document.body.classList.toggle("has-map-maximized", isMaximized);
  button.setAttribute("aria-expanded", String(isMaximized));
  button.textContent = isMaximized ? "Réduire la carte" : "Agrandir la carte";

  setTimeout(() => tripMap?.invalidateSize(), 120);
}

function isMapMaximized(): boolean {
  return Boolean(document.querySelector<HTMLDivElement>("#mapShell")?.classList.contains("is-map-maximized"));
}

function goToSiteFromMap(siteId: string): void {
  tripMap?.closePopup();
  toggleMapMaximized(false);
  markActiveSite(siteId);

  window.setTimeout(() => {
    const siteCard = document.getElementById(siteId);

    if (!siteCard) {
      window.location.hash = siteId;
      return;
    }

    siteCard.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.pushState(null, "", `#${siteId}`);
  }, 220);
}

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker non enregistré", error);
    });
  });
}

function isAppInstalled(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };

  return window.matchMedia("(display-mode: standalone)").matches || Boolean(navigatorWithStandalone.standalone);
}

function updateInstallButton(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-install-app]");

  if (!button) {
    return;
  }

  if (isAppInstalled()) {
    button.textContent = "App ajoutée";
    button.disabled = true;
    return;
  }

  button.textContent = deferredInstallPrompt ? "Installer l'app" : "Ajouter au téléphone";
  button.disabled = false;
}

async function handleInstallButtonClick(): Promise<void> {
  if (deferredInstallPrompt) {
    const installPrompt = deferredInstallPrompt;

    deferredInstallPrompt = null;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    updateInstallButton();
    return;
  }

  openInstallHelp();
}

function openInstallHelp(): void {
  const help = document.querySelector<HTMLDivElement>("#installHelp");

  if (!help) {
    return;
  }

  help.classList.add("is-open");
  help.setAttribute("aria-hidden", "false");
  document.body.classList.add("has-install-help-open");
  document.querySelector<HTMLButtonElement>(".install-help-close")?.focus();
}

function closeInstallHelp(): void {
  const help = document.querySelector<HTMLDivElement>("#installHelp");

  if (!help) {
    return;
  }

  help.classList.remove("is-open");
  help.setAttribute("aria-hidden", "true");
  document.body.classList.remove("has-install-help-open");
}

function createUsefulSubwayLayer(): L.LayerGroup {
  const layer = L.layerGroup();

  addSubwayLine(layer, "7", "#b933ad", [
    [40.759, -73.8297],
    [40.7465, -73.8914],
    [40.7517, -73.9407],
    [40.7554, -73.9874],
    [40.7538, -74.001],
  ]);
  addSubwayLine(layer, "F", "#ff6319", [
    [40.757, -73.941],
    [40.7646, -73.9661],
    [40.7639, -73.9774],
    [40.7253, -73.9962],
    [40.7131, -74.0097],
  ]);
  addSubwayLine(layer, "N/W", "#fccc0a", [
    [40.7568, -73.9296],
    [40.7626, -73.9679],
    [40.7546, -73.9868],
    [40.7413, -73.9893],
    [40.7048, -74.014],
  ]);
  addSubwayLine(layer, "4/5/6", "#00933c", [
    [40.8041, -73.9376],
    [40.7794, -73.9556],
    [40.7527, -73.9772],
    [40.7131, -74.0097],
    [40.7048, -74.014],
  ]);
  addSubwayLine(layer, "R/W", "#fccc0a", [
    [40.7626, -73.9679],
    [40.7587, -73.9813],
    [40.7357, -73.9911],
    [40.7072, -74.0134],
    [40.7031, -74.0128],
  ]);

  return layer;
}

function createSingForHopePianosLayer(): L.LayerGroup {
  const layer = L.layerGroup();

  singForHopePianos2026.forEach((piano) => {
    L.marker([piano.lat, piano.lng], {
      icon: L.divIcon({
        className: "piano-marker-icon",
        html: `<span class="piano-marker" aria-hidden="true">♪</span>`,
        iconAnchor: [15, 15],
        iconSize: [30, 30],
      }),
      title: `${piano.title} - ${piano.site}`,
    })
      .bindPopup(renderSingForHopePopup(piano))
      .addTo(layer);
  });

  return layer;
}

function renderSingForHopePopup(piano: PianoMapPoint): string {
  return `
    <div class="map-popup piano-popup">
      <b>Sing for Hope Piano ${piano.number}</b>
      <span>${escapeHtml(piano.title)}</span>
      <small>${escapeHtml(piano.site)}</small>
      <small>NYC 2026 : public du 18 mai au 7 juin.</small>
      <a href="https://www.singforhope.org/pianos/nyc26" target="_blank" rel="noreferrer">Carte officielle</a>
    </div>
  `;
}

function addSubwayLine(
  layer: L.LayerGroup,
  label: string,
  color: string,
  coordinates: [number, number][],
): void {
  const labelCoordinate = coordinates[Math.floor(coordinates.length / 2)];

  L.polyline(coordinates, {
    color,
    opacity: 0.94,
    weight: 7,
  })
    .bindTooltip(label, { sticky: true })
    .addTo(layer);

  L.marker(labelCoordinate, {
    interactive: false,
    icon: L.divIcon({
      className: "subway-line-label-icon",
      html: `<span class="subway-line-label" style="--subway-line-color: ${color}">${escapeHtml(label)}</span>`,
      iconAnchor: [18, 18],
      iconSize: [36, 36],
    }),
  }).addTo(layer);
}

function createUsefulBusTramLayer(): L.LayerGroup {
  const layer = L.layerGroup();

  addSurfaceTransitLine(layer, "Q32", "bus", "#2563eb", [
    [40.7568, -73.9296],
    [40.7587, -73.9813],
    [40.7506, -73.9935],
  ]);
  addSurfaceTransitLine(layer, "Q69", "bus", "#2563eb", [
    [40.7567, -73.9427],
    [40.766, -73.921],
    [40.7794, -73.915],
  ]);
  addSurfaceTransitLine(layer, "Q100", "bus", "#2563eb", [
    [40.7567, -73.9427],
    [40.766, -73.928],
    [40.786, -73.912],
  ]);
  addSurfaceTransitLine(layer, "M15", "bus", "#2563eb", [
    [40.8041, -73.9376],
    [40.7794, -73.9556],
    [40.7527, -73.9772],
    [40.7131, -74.0097],
  ]);
  addSurfaceTransitLine(layer, "M20", "bus", "#2563eb", [
    [40.758, -73.9855],
    [40.7413, -74.002],
    [40.7127, -74.0134],
    [40.7048, -74.014],
  ]);
  addSurfaceTransitLine(layer, "B62", "bus", "#2563eb", [
    [40.7567, -73.9427],
    [40.722, -73.957],
    [40.7043, -73.986],
    [40.695, -73.99],
  ]);
  addSurfaceTransitLine(layer, "Tram", "tram", "#dc2626", [
    [40.7616, -73.9644],
    [40.7619, -73.9503],
  ]);

  return layer;
}

function addSurfaceTransitLine(
  layer: L.LayerGroup,
  label: string,
  type: "bus" | "tram",
  color: string,
  coordinates: [number, number][],
): void {
  const labelCoordinate = coordinates[Math.floor(coordinates.length / 2)];

  L.polyline(coordinates, {
    color,
    dashArray: type === "tram" ? "2 7" : "8 7",
    opacity: 0.86,
    weight: 5,
  })
    .bindTooltip(label, { sticky: true })
    .addTo(layer);

  L.marker(labelCoordinate, {
    interactive: false,
    icon: L.divIcon({
      className: "surface-transit-label-icon",
      html: `<span class="surface-transit-label is-${type}" style="--surface-line-color: ${color}">${escapeHtml(label)}</span>`,
      iconAnchor: [22, 14],
      iconSize: [44, 28],
    }),
  }).addTo(layer);
}

function createMapIcon(site: Site & { map: MapPoint }): L.DivIcon {
  const dayInfo = dayBySiteId.get(site.id);
  const color = dayInfo ? getDayColor(dayInfo.index) : "#64748b";

  return L.divIcon({
    className: "map-marker-icon",
    html: `<div class="map-marker" style="--marker-color: ${color}"><span>${escapeHtml(site.map.label)}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function renderMapPopup(site: Site): string {
  const dayInfo = dayBySiteId.get(site.id);
  const dayLabel = dayInfo ? `<span>${escapeHtml(dayInfo.day.date)} · ${escapeHtml(dayInfo.day.title)}</span>` : "";

  return `
    <div class="map-popup">
      <b>${escapeHtml(site.title)}</b>
      ${dayLabel}
      <span>${site.borough} · ${site.category} · ${site.duration}</span>
      <a href="#${site.id}">Voir la fiche</a>
    </div>
  `;
}

function markActiveSite(siteId: string): void {
  document.querySelectorAll(".site").forEach((siteCard) => {
    siteCard.classList.toggle("is-active", siteCard.id === siteId);
  });
}

function buildDayBySiteId(): Map<string, { day: DayPlan; index: number }> {
  const map = new Map<string, { day: DayPlan; index: number }>();

  days.forEach((day, index) => {
    day.siteIds.forEach((siteId) => {
      if (!map.has(siteId)) {
        map.set(siteId, { day, index });
      }
    });
  });

  return map;
}

function getDayColor(index: number): string {
  return dayColors[index % dayColors.length];
}

function renderSites(): void {
  const list = document.querySelector<HTMLDivElement>("#site-list");
  const emptyState = document.querySelector<HTMLDivElement>("#empty-state");

  if (!list || !emptyState) {
    return;
  }

  const normalizedSearch = normalize(currentSearch);
  const visibleSites = sites.filter((site) => matchesFilter(site) && matchesSearch(site, normalizedSearch));

  list.innerHTML = visibleSites
    .map((site) => renderSite(site))
    .join("");
  emptyState.classList.toggle("is-visible", visibleSites.length === 0);
  bindImageFallbacks();
  hydrateDynamicImages(list);
}

function renderDynamicImage({
  alt,
  fallbackImage,
  query,
  slot,
  className,
}: {
  alt: string;
  fallbackImage: string;
  query: string;
  slot: number;
  className?: string;
}): string {
  return `<img class="${className ?? ""} dynamic-image is-loading" src="${escapeHtml(fallbackImage)}" alt="${escapeHtml(alt)}" loading="lazy" tabindex="0" data-lightbox-image data-image-query="${escapeHtml(query)}" data-image-slot="${slot}" data-fallback-image="${escapeHtml(fallbackImage)}" data-original-image="${escapeHtml(fallbackImage)}">`;
}

function getSiteImageQuery(site: Site, slot = 0): string {
  if (site.imageQuery) {
    return site.imageQuery;
  }

  const curatedImage = commonsSearchTerms.get(site.id);

  if (curatedImage) {
    return curatedImage;
  }

  if (slot === 1) {
    return `${site.title} ${site.borough} New York City`;
  }

  return `${site.title} ${site.category} travel photo New York`;
}

function getSiteFallbackImage(site: Site): string {
  const curatedImage = commonsSearchTerms.get(site.id);

  if (curatedImage?.startsWith("File:")) {
    return createPlaceholderImage(site.title);
  }

  return site.image;
}

function getDayImageQuery(day: DayPlan): string {
  const firstSite = day.siteIds.map((siteId) => siteById.get(siteId)).find(Boolean);
  return day.imageQuery ?? (firstSite ? getSiteImageQuery(firstSite) : `${day.title} New York City`);
}

function getDayFallbackImage(day: DayPlan): string {
  const firstSite = day.siteIds.map((siteId) => siteById.get(siteId)).find(Boolean);
  return firstSite ? getSiteFallbackImage(firstSite) : day.image;
}

function renderSite(site: Site): string {
  const actionItems = getSiteHighlights(site);
  const teenTip = getTeenTip(site);
  const teenInterests = getTeenInterests(site);
  const parentInterests = getParentInterests(site);
  const musicVenues = getMusicVenues(site);
  const secretCuriosity = getSecretCuriosity(site);
  const currentLocationUrl = buildGoogleMapsCurrentLocationRouteUrl(site);
  const dayInfo = dayBySiteId.get(site.id);
  const mapBadge = site.map
    ? `<span class="site-map-number" aria-label="Repère sur la carte">${escapeHtml(site.map.label)}</span>`
    : "";
  const mapLabel = site.map ? `Repère carte ${site.map.label}` : "Fiche destination";
  const dayLabel = dayInfo ? `${dayInfo.day.date} · ${dayInfo.day.title}` : "Hors planning";

  return `
    <article class="site" id="${site.id}" style="--site-color: ${dayInfo ? getDayColor(dayInfo.index) : "#0f766e"}">
      <div class="site-media">
        ${renderDynamicImage({
          alt: site.title,
          className: "cover",
          fallbackImage: getSiteFallbackImage(site),
          query: getSiteImageQuery(site, 0),
          slot: 0,
        })}
      </div>
      <div class="content">
        <div class="site-card-header">
          <div class="site-title-block">
            <div class="site-title-row">
              ${mapBadge}
              <div>
                <span class="date site-map-label-text">${escapeHtml(mapLabel)}</span>
                <h3>${escapeHtml(site.title)}</h3>
                <span class="site-day-label">${escapeHtml(dayLabel)}</span>
              </div>
            </div>
          </div>
          <button class="toplink" type="button" data-site-back>← Retour</button>
        </div>
        <div class="site-meta">
          <span class="site-meta-day">${escapeHtml(dayLabel)}</span>
          ${site.map ? `<span class="site-meta-number">Repère ${escapeHtml(site.map.label)}</span>` : ""}
          <span>${site.borough}</span>
          <span>${site.category}</span>
          <span>${site.duration}</span>
        </div>
        <a class="route-link site-route-link" href="${currentLocationUrl}" target="_blank" rel="noreferrer" data-current-route-site-id="${site.id}">
          Google Maps depuis ma position
        </a>
        <p>${escapeHtml(site.description)}</p>
        <div class="route top-five-card">
          <b>${site.id === "airport" ? "Top 5 départ :" : "Top 5 à voir / faire :"}</b>
          <ol class="top-five">
            ${actionItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ol>
        </div>
        <p class="tip tip-card"><b>Conseil famille :</b> ${escapeHtml(site.tip)}</p>
        <p class="tip tip-card teen-tip-card"><b>Mission ados :</b> ${escapeHtml(teenTip)}</p>
        <div class="parent-interest-card">
          <div class="parent-interest-heading">Centres d'intérêt proches</div>
          <div class="parent-interest-grid">
            <section class="parent-interest-item teen-interest-item">
              <span class="parent-interest-label">Ados</span>
              <p>${linkParentInterestPlaces(teenInterests.text)}</p>
            </section>
            <section class="parent-interest-item">
              <span class="parent-interest-label">Papa</span>
              <p>${linkParentInterestPlaces(parentInterests.papa)}</p>
            </section>
            <section class="parent-interest-item">
              <span class="parent-interest-label">Maman</span>
              <p>${linkParentInterestPlaces(parentInterests.maman)}</p>
            </section>
          </div>
        </div>
        <div class="music-venue-card">
          <b>Concerts publics, bars & musique live</b>
          <p>${linkParentInterestPlaces(musicVenues.text)}</p>
        </div>
        <div class="secret-curiosity-card">
          <b>Curiosité secrète : ${escapeHtml(secretCuriosity.title)}</b>
          <p>${escapeHtml(secretCuriosity.text)}</p>
        </div>
      </div>
    </article>
  `;
}

function getSiteHighlights(site: Site): string[] {
  return (
    siteHighlights.get(site.id) ?? [
      "Repérer le meilleur point photo du lieu.",
      "Prévoir une pause boisson en juillet.",
      "Adapter la durée selon fatigue des enfants.",
      "Vérifier les horaires avant de partir.",
      "Garder un plan retour simple vers le métro.",
    ]
  );
}

function getTeenTip(site: Site): string {
  return (
    teenTips.get(site.id) ??
    "Choisis un rôle simple : meilleur spot photo, itinéraire Google Maps ou repérage de la prochaine pause."
  );
}

function getTeenInterests(site: Site): TeenInterestPick {
  return (
    teenInterestsBySite.get(site.id) ?? {
      text: "Chercher un spot proche pour photo, dessert, gaming ou shopping sans rallonger la journée.",
    }
  );
}

function getParentInterests(site: Site): ParentInterestPick {
  const siteInterests = parentInterestsBySite.get(site.id);

  if (siteInterests) {
    return siteInterests;
  }

  const area = parentInterestAreaBySite.get(site.id);

  if (area) {
    const interests = parentInterestsByArea.get(area);

    if (interests) {
      return interests;
    }
  }

  return {
    papa: "Chercher le meilleur détour livres rares, mystère ou gadget à moins de 20 minutes du lieu.",
    maman: "Repérer une boutique sacs/accessoires ou une pause musique proche, sans rallonger la journée.",
  };
}

function getMusicVenues(site: Site): MusicVenuePick {
  const area = parentInterestAreaBySite.get(site.id);

  if (area) {
    const venues = musicVenuesByArea.get(area);

    if (venues) {
      return venues;
    }
  }

  return {
    text: "Chercher la programmation du quartier le jour même : concerts gratuits en parc, rooftop calme ou petit bar musical, selon l'énergie de la famille.",
  };
}

function getSecretCuriosity(site: Site): SecretCuriosity {
  return (
    secretCuriositiesBySite.get(site.id) ?? {
      title: "Détail caché",
      text: "Chercher un détail d'architecture, une ancienne fonction du lieu ou une plaque discrète : New York cache souvent son histoire à hauteur de trottoir.",
    }
  );
}

function linkParentInterestPlaces(text: string): string {
  const queryByLabel = new Map(parentInterestPlaceQueries);
  const labelPattern = Array.from(queryByLabel.keys())
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join("|");
  const placeRegex = new RegExp(`(^|[^\\p{L}\\p{N}])(${labelPattern})(?=$|[^\\p{L}\\p{N}])`, "gu");
  let linkedText = "";
  let lastIndex = 0;

  for (const match of text.matchAll(placeRegex)) {
    const fullMatch = match[0];
    const prefix = match[1] ?? "";
    const label = match[2];
    const matchIndex = match.index ?? 0;
    const labelIndex = matchIndex + prefix.length;
    const query = queryByLabel.get(label);

    if (!query) {
      continue;
    }

    linkedText += escapeHtml(text.slice(lastIndex, labelIndex));
    linkedText += `<a href="${buildGoogleMapsSearchUrl(query)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
    lastIndex = matchIndex + fullMatch.length;
  }

  linkedText += escapeHtml(text.slice(lastIndex));

  return linkedText;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildGoogleMapsSearchUrl(query: string): string {
  const params = new URLSearchParams({
    api: "1",
    query,
  });

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function bindInteractions(): void {
  updateInstallButton();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    updateInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    updateInstallButton();
    closeInstallHelp();
  });

  document.querySelector<HTMLInputElement>("#search")?.addEventListener("input", (event) => {
    const input = event.currentTarget;

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    currentSearch = input.value;
    renderSites();
  });

  document.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter as Filter;
      document.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      renderSites();
    });
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const link = event.target.closest<HTMLAnchorElement>("[data-current-route-site-id]");

    if (!link) {
      return;
    }

    const site = siteById.get(link.dataset.currentRouteSiteId ?? "");

    if (!site || !navigator.geolocation) {
      return;
    }

    event.preventDefault();
    const mapWindow = window.open(link.href, "_blank", "noopener,noreferrer");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const routeUrl = buildGoogleMapsCurrentLocationRouteUrl(site, position.coords);

        if (mapWindow) {
          mapWindow.location.href = routeUrl;
          return;
        }

        window.location.href = routeUrl;
      },
      () => {
        if (!mapWindow) {
          window.location.href = link.href;
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000 * 60 * 5,
        timeout: 8000,
      },
    );
  });

  document.querySelector<HTMLButtonElement>("[data-map-maximize]")?.addEventListener("click", () => {
    toggleMapMaximized();
  });

  document.querySelector<HTMLButtonElement>("[data-install-app]")?.addEventListener("click", () => {
    void handleInstallButtonClick();
  });

  document.querySelector<HTMLButtonElement>(".install-help-close")?.addEventListener("click", closeInstallHelp);

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const siteHashLink = event.target.closest<HTMLAnchorElement>('a[href^="#"]');

    if (siteHashLink && isMapMaximized()) {
      const siteId = siteHashLink.getAttribute("href")?.slice(1);

      if (siteId && siteById.has(siteId)) {
        event.preventDefault();
        goToSiteFromMap(siteId);
        return;
      }
    }

    if (event.target.closest<HTMLButtonElement>("[data-site-back]")) {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }

      window.location.hash = "carte";
      return;
    }

    const image = event.target.closest<HTMLImageElement>("img[data-lightbox-image]");

    if (image) {
      openImageLightbox(image);
      return;
    }

    const lightbox = document.querySelector<HTMLDivElement>("#imageLightbox");

    if (lightbox?.classList.contains("is-open") && event.target === lightbox) {
      closeImageLightbox();
      return;
    }

    const installHelp = document.querySelector<HTMLDivElement>("#installHelp");

    if (installHelp?.classList.contains("is-open") && event.target === installHelp) {
      closeInstallHelp();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeImageLightbox();
      closeInstallHelp();
      toggleMapMaximized(false);
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const image = event.target;

    if (image instanceof HTMLImageElement && image.matches("img[data-lightbox-image]")) {
      event.preventDefault();
      openImageLightbox(image);
    }
  });

  document.querySelector<HTMLButtonElement>(".image-lightbox-close")?.addEventListener("click", closeImageLightbox);
}

function openImageLightbox(sourceImage: HTMLImageElement): void {
  const lightbox = document.querySelector<HTMLDivElement>("#imageLightbox");
  const lightboxImage = lightbox?.querySelector<HTMLImageElement>("img");
  const caption = lightbox?.querySelector<HTMLParagraphElement>("p");

  if (!lightbox || !lightboxImage || !caption) {
    return;
  }

  lightboxImage.src = sourceImage.dataset.originalImage ?? sourceImage.currentSrc ?? sourceImage.src;
  lightboxImage.alt = sourceImage.alt;
  caption.textContent = sourceImage.alt;
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("has-lightbox-open");
  document.querySelector<HTMLButtonElement>(".image-lightbox-close")?.focus();
}

function closeImageLightbox(): void {
  const lightbox = document.querySelector<HTMLDivElement>("#imageLightbox");
  const lightboxImage = lightbox?.querySelector<HTMLImageElement>("img");

  if (!lightbox?.classList.contains("is-open")) {
    return;
  }

  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("has-lightbox-open");

  if (lightboxImage) {
    lightboxImage.removeAttribute("src");
  }
}

function matchesFilter(site: Site): boolean {
  if (currentFilter === "Tous") {
    return true;
  }

  if (currentFilter === "Incontournables") {
    return site.category === "Incontournable";
  }

  if (currentFilter === "Musées") {
    return site.category === "Musée";
  }

  if (currentFilter === "Quartiers") {
    return site.category === "Quartier";
  }

  return site.borough === currentFilter;
}

function matchesSearch(site: Site, normalizedSearch: string): boolean {
  if (!normalizedSearch) {
    return true;
  }

  const haystack = normalize(
    `${site.title} ${site.description} ${site.tip} ${site.borough} ${site.category}`,
  );
  return haystack.includes(normalizedSearch);
}

function hydrateDynamicImages(root: ParentNode = document): void {
  const images = [...root.querySelectorAll<HTMLImageElement>("img[data-image-query]")];

  if (!("IntersectionObserver" in window)) {
    images.forEach((image) => void resolveDynamicImage(image));
    return;
  }

  imageObserver ??= new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLImageElement)) {
          return;
        }

        imageObserver?.unobserve(entry.target);
        void resolveDynamicImage(entry.target);
      });
    },
    { rootMargin: "420px 0px" },
  );

  images.forEach((image) => {
    if (observedImages.has(image)) {
      return;
    }

    observedImages.add(image);
    imageObserver?.observe(image);
  });
}

async function hydrateHeroImage(): Promise<void> {
  const hero = document.querySelector<HTMLElement>("[data-hero-image]");

  if (!hero) {
    return;
  }

  const fallbackImage = hero.dataset.fallbackImage ?? heroImage;
  const query = hero.dataset.imageQuery ?? heroImageQuery;
  const images = await getCommonsImages(query);
  const image = images[0];

  setHeroBackground(hero, image?.originalUrl ?? fallbackImage);
  hero.classList.remove("is-loading-image");
}

async function resolveDynamicImage(image: HTMLImageElement): Promise<void> {
  const query = image.dataset.imageQuery;
  const fallbackImage = image.dataset.fallbackImage;

  if (!query || !fallbackImage) {
    return;
  }

  const slot = Number.parseInt(image.dataset.imageSlot ?? "0", 10);
  const commonsImages = await getCommonsImages(query);
  const imageIndex = Number.isFinite(slot) ? slot : 0;
  const commonsImage =
    commonsImages[imageIndex] ?? (commonsImages.length > 0 ? commonsImages[imageIndex % commonsImages.length] : undefined);

  if (!commonsImage) {
    image.src = fallbackImage;
    image.dataset.originalImage = fallbackImage;
    image.classList.remove("is-loading");
    return;
  }

  image.src = commonsImage.thumbUrl;
  image.dataset.originalImage = commonsImage.originalUrl;
  image.classList.remove("is-loading");
}

async function getCommonsImages(query: string): Promise<CommonsImage[]> {
  const normalizedQuery = normalize(query);
  const cachedImages = readCommonsImageCache(normalizedQuery);

  if (cachedImages) {
    return cachedImages;
  }

  const pendingRequest = commonsImageRequests.get(normalizedQuery);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request = (async () => {
    const imagesByUrl = new Map<string, CommonsImage>();

    for (const requestUrl of buildCommonsRequestUrls(query)) {
      const response = await fetch(requestUrl);

      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        continue;
      }

      const data = (await response.json()) as CommonsApiResponse;
      const images = parseCommonsImages(data);

      images.forEach((image) => {
        if (!imagesByUrl.has(image.originalUrl)) {
          imagesByUrl.set(image.originalUrl, image);
        }
      });

      if (imagesByUrl.size >= 6) {
        break;
      }
    }

    const images = [...imagesByUrl.values()];
    if (images.length > 0) {
      writeCommonsImageCache(normalizedQuery, images);
    }
    return images;
  })()
    .catch((error) => {
      console.warn("Impossible de charger les images Commons", error);
      return [];
    })
    .finally(() => {
      commonsImageRequests.delete(normalizedQuery);
    });

  commonsImageRequests.set(normalizedQuery, request);
  return request;
}

function buildCommonsRequestUrls(query: string): string[] {
  if (query.startsWith("File:")) {
    return [buildCommonsFileUrl(query), ...buildCommonsSearchTexts(cleanCommonsFileQuery(query)).map(buildCommonsSearchUrl)];
  }

  return buildCommonsSearchTexts(query).map(buildCommonsSearchUrl);
}

function cleanCommonsFileQuery(query: string): string {
  return query
    .replace(/^File:/, "")
    .replace(/\.(jpe?g|png|webp|tif|tiff)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCommonsFileUrl(title: string): string {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|mime|mediatype|extmetadata",
    iiurlwidth: "960",
  });

  return `${commonsApiUrl}?${params.toString()}`;
}

function buildCommonsSearchUrl(searchText: string): string {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "8",
    gsrsearch: searchText,
    prop: "imageinfo",
    iiprop: "url|mime|mediatype|extmetadata",
    iiurlwidth: "960",
  });

  return `${commonsApiUrl}?${params.toString()}`;
}

function buildCommonsSearchTexts(query: string): string[] {
  const quotedQuery = query.replace(/"/g, "").trim();
  return [`intitle:"${quotedQuery}" New York`, quotedQuery, `${quotedQuery} New York City`];
}

function parseCommonsImages(data: CommonsApiResponse): CommonsImage[] {
  return Object.values(data.query?.pages ?? {})
    .map((page) => {
      const imageInfo = page.imageinfo?.[0];

      if (!imageInfo?.url || !imageInfo.descriptionurl) {
        return undefined;
      }

      if (!imageInfo.mime?.startsWith("image/") || imageInfo.mediatype !== "BITMAP") {
        return undefined;
      }

      return {
        title: page.title ?? "Image Wikimedia Commons",
        thumbUrl: imageInfo.thumburl ?? imageInfo.url,
        originalUrl: imageInfo.url,
        descriptionUrl: imageInfo.descriptionurl,
      };
    })
    .filter((image): image is CommonsImage => Boolean(image));
}

function readCommonsImageCache(query: string): CommonsImage[] | undefined {
  const cache = readCommonsCache();
  const entry = cache[query];

  if (!entry || Date.now() - entry.fetchedAt > commonsCacheMaxAgeMs) {
    return undefined;
  }

  return entry.images;
}

function writeCommonsImageCache(query: string, images: CommonsImage[]): void {
  const cache = readCommonsCache();

  cache[query] = {
    fetchedAt: Date.now(),
    images,
  };

  localStorage.setItem(commonsCacheKey, JSON.stringify(cache));
}

function readCommonsCache(): CommonsImageCache {
  const rawValue = localStorage.getItem(commonsCacheKey);

  if (!rawValue) {
    return {};
  }

  try {
    const value = JSON.parse(rawValue);
    return isCommonsImageCache(value) ? value : {};
  } catch {
    return {};
  }
}

function isCommonsImageCache(value: unknown): value is CommonsImageCache {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function setHeroBackground(hero: HTMLElement, imageUrl: string): void {
  hero.style.backgroundImage = `linear-gradient(180deg, rgba(11, 18, 32, 0.18), rgba(11, 18, 32, 0.8)), url("${imageUrl}")`;
}

function bindImageFallbacks(): void {
  document.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    image.onerror = () => {
      const title = image.alt || "New York";
      const fallbackImage = image.dataset.fallbackImage;
      const currentSrc = image.getAttribute("src");

      if (!fallbackImage || image.dataset.fallbackApplied === "true" || currentSrc === fallbackImage) {
        image.src = createPlaceholderImage(title);
        image.classList.remove("is-loading");
        return;
      }

      image.src = fallbackImage;
      image.dataset.fallbackApplied = "true";
      image.classList.remove("is-loading");
    };
  });
}

function createPlaceholderImage(title: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0f766e"/><stop offset="1" stop-color="#1f2937"/></linearGradient></defs><rect width="1200" height="700" fill="url(#g)"/><text x="60" y="330" font-family="Arial" font-size="58" fill="white" font-weight="700">${escapeHtml(title)}</text><text x="60" y="410" font-family="Arial" font-size="30" fill="#d1fae5">Recherche d'une photo Commons...</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
