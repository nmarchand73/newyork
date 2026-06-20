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
const dayBySiteId = buildDayBySiteId();

let currentFilter: Filter = "Tous";
let currentSearch = "";
let imageObserver: IntersectionObserver | null = null;
const observedImages = new WeakSet<HTMLImageElement>();
const commonsImageRequests = new Map<string, Promise<CommonsImage[]>>();
let tripMap: L.Map | null = null;

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Impossible de trouver le conteneur #app.");
}

app.innerHTML = `
  <header class="hero is-loading-image" data-hero-image data-image-query="${escapeHtml(heroImageQuery)}" data-fallback-image="${heroImage}">
    <div class="hero-content">
      <p class="eyebrow">Planning familial interactif · 4 → 12 juillet 2026</p>
      <h1>New York en famille</h1>
      <p>Un programme dynamique depuis le Wingate by Wyndham Long Island City, 38-70 12th Street, Queens : carte, filtres, fiches détaillées, photos chargées depuis Wikimedia Commons et liens Google Maps.</p>
      <div class="hero-actions">
        <a class="btn" href="#carte">Voir la carte</a>
        <a class="btn" href="#planning">Voir le planning</a>
        <a class="btn secondary" href="#details">Explorer les fiches</a>
      </div>
    </div>
  </header>
  <main class="wrap">
    <section class="notice">
      <div><strong>Hôtel :</strong> Wingate by Wyndham Long Island City, <strong>38-70 12th Street, Long Island City, Queens, NY 11101</strong>.</div>
      <div><strong>Base transport :</strong> stations utiles : <strong>21 St-Queensbridge</strong> pour F et <strong>Queensboro Plaza</strong> pour 7, N, W.</div>
      <div class="tip">Démarrez vers 9 h-9 h 30, gardez une vraie pause déjeuner et rentrez à l'hôtel si chaleur ou fatigue.</div>
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
          <p>Carte dynamique Leaflet avec OpenStreetMap par défaut, zoom souris/tactile et marqueurs géolocalisés par jour.</p>
        </div>
      </div>
      <div class="map-layout">
        <div class="ny-map" id="leafletMap" aria-label="Carte Leaflet interactive de New York">
        </div>
        <div class="map-list">
          <b>Numéros sur la carte</b>
          <div class="day-legend">
            ${days.map(renderDayLegendItem).join("")}
          </div>
          <div class="map-activities">
            ${days.map(renderMapActivityDay).join("")}
          </div>
          <p class="map-credit">Carte dynamique : <a href="https://leafletjs.com/" target="_blank" rel="noreferrer">Leaflet</a> + <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>. Calque satellite disponible dans le sélecteur.</p>
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
  <div class="image-lightbox" id="imageLightbox" aria-hidden="true" role="dialog" aria-label="Photo en plein écran">
    <button class="image-lightbox-close" type="button" aria-label="Fermer la photo">×</button>
    <img src="" alt="">
    <p></p>
  </div>
`;

renderSites();
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

  const cartoLayer = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 20,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  );

  const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  );

  const subwayLayer = L.tileLayer("https://tile.tracestrack.com/subway-route/{z}/{x}/{y}.png", {
    maxZoom: 19,
    opacity: 0.9,
    attribution: "Subway routes &copy; Tracestrack, &copy; OpenStreetMap contributors",
  });

  const busTramLayer = L.tileLayer("https://tile.tracestrack.com/bus-route/{z}/{x}/{y}.png", {
    maxZoom: 19,
    opacity: 0.78,
    attribution: "Bus routes &copy; Tracestrack, &copy; OpenStreetMap contributors",
  });

  osmLayer.addTo(tripMap);
  L.control
    .layers(
      {
        OpenStreetMap: osmLayer,
        "Carte claire": cartoLayer,
        Satellite: satelliteLayer,
      },
      {
        "Lignes de métro": subwayLayer,
        "Lignes de bus / tram": busTramLayer,
      },
      {
        position: "topright",
      },
    )
    .addTo(tripMap);
  L.control.scale({ imperial: false }).addTo(tripMap);

  const markers = mappedSites.map((site) => {
    const marker = L.marker([site.map.lat, site.map.lng], {
      icon: createMapIcon(site),
      title: site.title,
    }).bindPopup(renderMapPopup(site));

    marker.on("click", () => markActiveSite(site.id));
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

function createMapIcon(site: Site & { map: MapPoint }): L.DivIcon {
  const dayInfo = dayBySiteId.get(site.id);
  const color = dayInfo ? getDayColor(dayInfo.index) : "#64748b";

  return L.divIcon({
    className: "map-marker-icon",
    html: `<div class="map-marker" style="--marker-color: ${color}"><span>${escapeHtml(site.map.label)}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
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
  const currentLocationUrl = buildGoogleMapsCurrentLocationRouteUrl(site);

  return `
    <article class="site" id="${site.id}">
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
          <div>
            <span class="date">Fiche destination</span>
            <h3>${escapeHtml(site.title)}</h3>
          </div>
          <a class="toplink" href="#planning">planning</a>
        </div>
        <div class="site-meta">
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

function bindInteractions(): void {
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

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
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
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeImageLightbox();
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
