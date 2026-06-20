import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";

type Borough = "Queens" | "Manhattan" | "Brooklyn" | "Liberty Island";
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
  credit: string;
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
const commonsCacheKey = "nyc-2026-commons-image-cache-v3";
const commonsCacheMaxAgeMs = 1000 * 60 * 60 * 24 * 14;
const placeholderImage = createPlaceholderImage("Chargement photo");

const sites: Site[] = [
  {
    id: "fireworks",
    title: "Feu d'artifice du 4 juillet",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Macy%27s_4th_of_July_Fireworks_2011_-_New_York_City.jpg",
    description:
      "À voir seulement si tout le monde garde de l'énergie après l'arrivée. La foule est très importante autour des grands points de vue.",
    tip: "Depuis Queens, privilégier une vue locale plutôt qu'un grand déplacement le soir de l'arrivée.",
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
    tip: "Parfait le premier soir, le matin du départ ou au coucher du soleil.",
    borough: "Queens",
    category: "Parc",
    duration: "45 min",
    map: { label: "H", lat: 40.7476, lng: -73.957 },
  },
  {
    id: "times-square",
    title: "Times Square",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/1_times_square_night_2013.jpg",
    description:
      "Le New York lumineux et spectaculaire : écrans géants, magasins, ambiance permanente. Idéal pour le premier contact avec Manhattan.",
    tip: "Meilleur moment : fin d'après-midi ou soirée.",
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
    tip: "À combiner avec la New York Public Library.",
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
    tip: "Visite courte possible : 30 à 45 minutes.",
    borough: "Manhattan",
    category: "Musée",
    duration: "45 min",
  },
  {
    id: "grand-central",
    title: "Grand Central Terminal",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Grand_Central_Terminal_Main_Concourse_Jan_2006.jpg",
    description:
      "Grande gare mythique avec plafond étoilé, architecture spectaculaire et food court pratique.",
    tip: "Pause idéale si météo chaude ou pluie.",
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
    tip: "Très photogénique autour de la 5th Avenue.",
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
    tip: "Réserver un créneau proche du coucher du soleil si possible.",
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
    tip: "Réserver le bateau tôt ; éviter les sacs volumineux.",
    borough: "Liberty Island",
    category: "Incontournable",
    duration: "3 h",
    map: { label: "11", lat: 40.6892, lng: -74.0445 },
  },
  {
    id: "ellis",
    title: "Ellis Island",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Ellis_Island_Main_Building.jpg",
    description:
      "Musée de l'immigration, émouvant et intéressant pour comprendre l'histoire des arrivées à New York.",
    tip: "Prévoir 1 h à 1 h 30 selon l'intérêt des enfants.",
    borough: "Liberty Island",
    category: "Musée",
    duration: "1 h 30",
  },
  {
    id: "wall-street",
    title: "Wall Street",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/New_York_Stock_Exchange_Front.jpg",
    description:
      "Quartier financier : New York Stock Exchange, Federal Hall, rues étroites et ambiance business.",
    tip: "Visite courte, surtout pour les photos.",
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
    tip: "Très pratique pour une pause climatisée.",
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
    tip: "Avec ados : expliquer avant la visite pour donner du contexte.",
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
    tip: "Commencer côté Manhattan et terminer à DUMBO.",
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
    tip: "Très fréquenté : venir matin ou fin de journée.",
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
    tip: "À combiner avec Brooklyn Bridge Park.",
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
    tip: "Parfait pour repos, glace, photos et coucher de soleil.",
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
    tip: "Ne pas vouloir tout faire : viser une zone.",
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
    tip: "Très beau en milieu de matinée.",
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
    tip: "Choisir 2 ou 3 zones, pas tout le musée.",
    borough: "Manhattan",
    category: "Musée",
    duration: "2 h 30",
    map: { label: "5", lat: 40.7813, lng: -73.9735 },
  },
  {
    id: "met",
    title: "Metropolitan Museum of Art",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Metropolitan_Museum_of_Art_%28The_Met%29_-_Central_Park.jpg",
    description:
      "Immense musée d'art : Égypte, armures, peinture européenne, rooftop selon saison.",
    tip: "À préférer si la famille aime l'histoire et l'art.",
    borough: "Manhattan",
    category: "Musée",
    duration: "2 h",
    map: { label: "6", lat: 40.7794, lng: -73.9632 },
  },
  {
    id: "hudson-yards",
    title: "Hudson Yards",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Hudson_Yards_from_High_Line_2019.jpg",
    description:
      "Quartier moderne, buildings récents, accès direct à la High Line.",
    tip: "Bon point de départ avec la ligne 7.",
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
      "Structure monumentale de Hudson Yards, très photogénique depuis l'extérieur.",
    tip: "Vérifier les conditions d'accès avant visite.",
    borough: "Manhattan",
    category: "Incontournable",
    duration: "20 min",
  },
  {
    id: "high-line",
    title: "High Line",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/High_Line_20th_Street_looking_downtown.jpg",
    description:
      "Ancienne voie ferrée transformée en promenade végétalisée au-dessus des rues.",
    tip: "Marcher de Hudson Yards vers Chelsea Market.",
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
    tip: "Très pratique pour déjeuner en famille.",
    borough: "Manhattan",
    category: "Pause",
    duration: "1 h",
  },
  {
    id: "little-island",
    title: "Little Island",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Little_Island_New_York_City.jpg",
    description:
      "Parc suspendu sur l'Hudson, original et agréable pour une pause.",
    tip: "À faire après Chelsea Market si tout le monde a encore envie de marcher.",
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
    tip: "À faire si vous voulez une visite courte et locale.",
    borough: "Queens",
    category: "Musée",
    duration: "1 h",
  },
  {
    id: "flushing",
    title: "Flushing",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Main_Street_Flushing_Queens_NY.jpg",
    description:
      "Quartier vivant du Queens, connu pour sa cuisine asiatique et son ambiance très différente de Manhattan.",
    tip: "Y aller avec la ligne 7 jusqu'au terminus Flushing-Main St.",
    borough: "Queens",
    category: "Quartier",
    duration: "2 h",
    map: { label: "15", lat: 40.759, lng: -73.8297 },
  },
  {
    id: "astoria",
    title: "Astoria",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Astoria_Park_Hell_Gate_Bridge.jpg",
    description:
      "Quartier agréable du Queens, restaurants grecs, Astoria Park et vue sur les ponts.",
    tip: "Bonne option dîner plus calme.",
    borough: "Queens",
    category: "Quartier",
    duration: "1 h 30",
    map: { label: "16", lat: 40.7797, lng: -73.922 },
  },
  {
    id: "soho",
    title: "SoHo",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/SoHo_Cast_Iron_Historic_District.jpg",
    description:
      "Boutiques, façades cast-iron, rues animées et très photogéniques.",
    tip: "Prévoir du temps libre pour shopping.",
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
    tip: "Idéal pour déjeuner simple et dépaysant.",
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
    tip: "À voir en passant depuis Chinatown.",
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
    tip: "Très bon final après SoHo/Chinatown.",
    borough: "Manhattan",
    category: "Parc",
    duration: "45 min",
  },
];

const days: DayPlan[] = [
  {
    id: "day-4",
    date: "Samedi 4 juillet",
    title: "Arrivée, douanes et installation",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Macy%27s_4th_of_July_Fireworks_2011_-_New_York_City.jpg",
    summary: "Arrivée à 19 h : prévoyez 2 h à 2 h 30 pour douanes, bagages et transfert.",
    route:
      "JFK = AirTrain + métro ; LaGuardia = bus + métro ; Newark = train + métro. Arrivée probable hôtel : 21 h 30-22 h 30.",
    siteIds: ["gantry", "fireworks"],
    layout: "full",
  },
  {
    id: "day-5",
    date: "Dimanche 5 juillet",
    title: "Midtown spectaculaire",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/1_times_square_night_2013.jpg",
    summary: "Premier vrai contact avec Manhattan, entre lumières, architecture et vue panoramique.",
    route: "Queensboro Plaza -> 7/N/W vers Manhattan.",
    siteIds: ["times-square", "bryant", "library", "grand-central", "rockefeller", "top-rock"],
  },
  {
    id: "day-6",
    date: "Lundi 6 juillet",
    title: "Statue & Lower Manhattan",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Statue_of_Liberty_7.jpg",
    summary: "Une journée historique : ferry, Liberty Island, Ellis Island et Financial District.",
    route: "21 St-Queensbridge -> F/M, puis R/W ou 4/5 vers Bowling Green / Whitehall.",
    siteIds: ["liberty", "ellis", "wall-street", "oculus", "memorial911"],
  },
  {
    id: "day-7",
    date: "Mardi 7 juillet",
    title: "Brooklyn Bridge & DUMBO",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Brooklyn_Bridge_Postdlf.jpg",
    summary: "Traversée à pied, photos à DUMBO et pause au bord de l'East River.",
    route: "Queensboro Plaza -> 7 jusqu'à Grand Central, puis 4/5/6 vers Brooklyn Bridge-City Hall.",
    siteIds: ["brooklyn-bridge", "dumbo", "carousel", "bbpark"],
  },
  {
    id: "day-8",
    date: "Mercredi 8 juillet",
    title: "Central Park + musée",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Central_Park_New_York_City_New_York_23_crop.jpg",
    summary: "Matinée verte, puis choix entre dinosaures, art ou pause légère selon l'énergie.",
    route: "21 St-Queensbridge -> F/M vers 57 St ou Lexington Av/63 St.",
    siteIds: ["central-park", "bethesda", "amnh", "met"],
  },
  {
    id: "day-9",
    date: "Jeudi 9 juillet",
    title: "High Line, Chelsea & Hudson Yards",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/High_Line_20th_Street_looking_downtown.jpg",
    summary: "Quartier moderne, promenade suspendue, déjeuner facile et pause au bord de l'Hudson.",
    route: "Queensboro Plaza -> 7 direct jusqu'à 34 St-Hudson Yards.",
    siteIds: ["hudson-yards", "vessel", "high-line", "chelsea-market", "little-island"],
  },
  {
    id: "day-10",
    date: "Vendredi 10 juillet",
    title: "Queens local & skyline",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Gantry_Plaza_State_Park_2012.jpg",
    summary: "Une journée plus souple côté Queens, parfaite pour respirer entre deux grosses visites.",
    route: "Marche locale ; Flushing par 7, Astoria par N/W.",
    siteIds: ["gantry", "moma-ps1", "flushing", "astoria"],
  },
  {
    id: "day-11",
    date: "Samedi 11 juillet",
    title: "SoHo, Chinatown, Little Italy",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Canal_Street_Chinatown_New_York_City.jpg",
    summary: "Rues animées, shopping, snacks, façades photogéniques et final dans Greenwich Village.",
    route: "21 St-Queensbridge -> F/M vers Broadway-Lafayette.",
    siteIds: ["soho", "chinatown", "little-italy", "washington-square"],
  },
  {
    id: "day-12",
    date: "Dimanche 12 juillet",
    title: "Dernière balade & départ",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/JFK_Airport_Terminal_4.jpg",
    summary: "Dernières photos proches de l'hôtel, puis départ sans stress.",
    route: "Quitter l'hôtel environ 4 h avant un vol international.",
    siteIds: ["gantry"],
  },
];

const filters: Filter[] = [
  "Tous",
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Liberty Island",
  "Incontournables",
  "Musées",
  "Quartiers",
];

const siteById = new Map(sites.map((site) => [site.id, site]));
const commonsSearchTerms = new Map<string, string>([
  ["fireworks", "Macy's 4th of July Fireworks New York City"],
  ["gantry", "Gantry Plaza State Park"],
  ["times-square", "Times Square"],
  ["bryant", "Bryant Park New York"],
  ["library", "New York Public Library Main Branch"],
  ["grand-central", "Grand Central Terminal"],
  ["rockefeller", "Rockefeller Center New York"],
  ["top-rock", "Top of the Rock New York"],
  ["liberty", "Statue of Liberty 7"],
  ["ellis", "Ellis Island"],
  ["wall-street", "New York Stock Exchange Wall Street"],
  ["oculus", "Oculus World Trade Center Transportation Hub"],
  ["memorial911", "National September 11 Memorial"],
  ["brooklyn-bridge", "Brooklyn Bridge"],
  ["dumbo", "DUMBO Brooklyn Manhattan Bridge"],
  ["carousel", "Jane's Carousel Brooklyn"],
  ["bbpark", "Brooklyn Bridge Park Manhattan skyline"],
  ["central-park", "Central Park New York"],
  ["bethesda", "Bethesda Terrace Central Park"],
  ["amnh", "American Museum of Natural History"],
  ["met", "Metropolitan Museum of Art New York"],
  ["hudson-yards", "Hudson Yards New York"],
  ["vessel", "Vessel Hudson Yards"],
  ["high-line", "High Line New York"],
  ["chelsea-market", "Chelsea Market New York"],
  ["little-island", "Little Island New York"],
  ["moma-ps1", "MoMA PS1"],
  ["flushing", "Main Street Flushing Queens"],
  ["astoria", "Astoria Park Hell Gate Bridge"],
  ["soho", "SoHo Cast Iron Historic District"],
  ["chinatown", "Canal Street Chinatown New York"],
  ["little-italy", "Mulberry Street Little Italy New York"],
  ["washington-square", "Washington Square Park Arch"],
]);
const completedKey = "nyc-2026-completed-sites";

let currentFilter: Filter = "Tous";
let currentSearch = "";
let imageObserver: IntersectionObserver | null = null;
const observedImages = new WeakSet<HTMLImageElement>();
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
      <p>Un programme dynamique depuis l'hôtel au 38-70 12th Street, Queens : carte, filtres, fiches détaillées, photos chargées depuis Wikimedia Commons et checklist sauvegardée dans le navigateur.</p>
      <div class="hero-actions">
        <a class="btn" href="#carte">Voir la carte</a>
        <a class="btn" href="#planning">Voir le planning</a>
        <a class="btn secondary" href="#details">Explorer les fiches</a>
      </div>
    </div>
  </header>
  <main class="wrap">
    <section class="notice">
      <div><strong>Base transport :</strong> stations utiles : <strong>21 St-Queensbridge</strong> pour F/M et <strong>Queensboro Plaza</strong> pour 7, N, W.</div>
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
          <p>Carte dynamique Leaflet, comme la carte USA : zoom, tuiles OpenStreetMap et marqueurs géolocalisés.</p>
        </div>
      </div>
      <div class="map-layout">
        <div class="ny-map" id="leafletMap" aria-label="Carte Leaflet interactive de New York">
        </div>
        <div class="map-list">
          <b>Accès rapide aux fiches</b>
          ${sites
            .filter((site) => site.map)
            .map((site) => `<a href="#${site.id}">${escapeHtml(site.title)} — ${site.borough}</a>`)
            .join("")}
          <p class="map-credit">Carte dynamique : <a href="https://leafletjs.com/" target="_blank" rel="noreferrer">Leaflet</a> + tuiles <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>.</p>
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
      <div class="grid">${days.map(renderDay).join("")}</div>
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
        <span class="chip">F/M : Queensbridge ↔ Midtown / Downtown</span>
        <span class="chip">N/W : Queensboro Plaza ↔ Midtown</span>
        <span class="chip">4/5/6 : axe Est de Manhattan</span>
        <span class="chip">R/W : accès Bowling Green / Whitehall</span>
      </div>
    </section>
  </main>
  <footer class="footer">Planning familial interactif — New York, juillet 2026</footer>
`;

renderSites();
bindInteractions();
bindImageFallbacks();
hydrateDynamicImages();
hydrateHeroImage();
initLeafletMap();

function renderDay(day: DayPlan): string {
  const links = day.siteIds
    .map((siteId) => siteById.get(siteId))
    .filter((site): site is Site => Boolean(site))
    .map((site) => `<a class="pill-link" href="#${site.id}">${escapeHtml(site.title)}</a>`)
    .join("");

  return `
    <article class="day ${day.layout ?? ""}" id="${day.id}">
      ${renderDynamicImage({
        alt: day.title,
        fallbackImage: day.image,
        query: getDayImageQuery(day),
        slot: 0,
      })}
      <div class="content">
        <span class="date">${escapeHtml(day.date)}</span>
        <h3>${escapeHtml(day.title)}</h3>
        <p>${escapeHtml(day.summary)}</p>
        <div class="route"><b>Trajet :</b> ${escapeHtml(day.route)}</div>
        <div class="links">${links}</div>
        <a class="image-credit" href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer">Images : Wikimedia Commons</a>
      </div>
    </article>
  `;
}

function renderFilter(filter: Filter): string {
  const activeClass = filter === currentFilter ? " is-active" : "";
  return `<button class="filter${activeClass}" type="button" data-filter="${filter}">${filter}</button>`;
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
    scrollWheelZoom: false,
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

  cartoLayer.addTo(tripMap);
  L.control.layers({ "Carte claire": cartoLayer, OpenStreetMap: osmLayer }, undefined, {
    position: "topright",
  }).addTo(tripMap);
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
  const className = site.borough === "Queens" ? "map-marker queens-marker" : "map-marker";

  return L.divIcon({
    className,
    html: `<span>${escapeHtml(site.map.label)}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });
}

function renderMapPopup(site: Site): string {
  return `
    <div class="map-popup">
      <b>${escapeHtml(site.title)}</b>
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

function renderSites(): void {
  const list = document.querySelector<HTMLDivElement>("#site-list");
  const emptyState = document.querySelector<HTMLDivElement>("#empty-state");

  if (!list || !emptyState) {
    return;
  }

  const completedSites = readCompletedSites();
  const normalizedSearch = normalize(currentSearch);
  const visibleSites = sites.filter((site) => matchesFilter(site) && matchesSearch(site, normalizedSearch));

  list.innerHTML = visibleSites
    .map((site) => renderSite(site, completedSites.has(site.id)))
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
  return `<img class="${className ?? ""} dynamic-image is-loading" src="${placeholderImage}" alt="${escapeHtml(alt)}" loading="lazy" data-image-query="${escapeHtml(query)}" data-image-slot="${slot}" data-fallback-image="${escapeHtml(fallbackImage)}">`;
}

function getSiteImageQuery(site: Site): string {
  return site.imageQuery ?? commonsSearchTerms.get(site.id) ?? site.title;
}

function getDayImageQuery(day: DayPlan): string {
  const firstSite = day.siteIds.map((siteId) => siteById.get(siteId)).find(Boolean);
  return day.imageQuery ?? (firstSite ? getSiteImageQuery(firstSite) : `${day.title} New York City`);
}

function renderSite(site: Site, isCompleted: boolean): string {
  return `
    <article class="site" id="${site.id}">
      ${renderDynamicImage({
        alt: site.title,
        className: "cover",
        fallbackImage: site.image,
        query: getSiteImageQuery(site),
        slot: 0,
      })}
      <div class="content">
        <a class="toplink" href="#planning">↑ planning</a>
        <span class="date">Fiche destination</span>
        <h3>${escapeHtml(site.title)}</h3>
        <div class="site-meta">
          <span>${site.borough}</span>
          <span>${site.category}</span>
          <span>${site.duration}</span>
        </div>
        <p>${escapeHtml(site.description)}</p>
        <div class="route">
          <b>À voir / faire :</b>
          <ul>
            <li>Prendre des photos et repérer les points de vue.</li>
            <li>Prévoir une pause boisson en juillet.</li>
            <li>Adapter la durée selon fatigue des enfants.</li>
          </ul>
        </div>
        <p class="tip">${escapeHtml(site.tip)}</p>
        <label class="check-row">
          <input type="checkbox" data-site-id="${site.id}" ${isCompleted ? "checked" : ""}>
          Marquer comme préparé / réservé
        </label>
        <div class="photos">
          ${renderDynamicImage({
            alt: `${site.title} photo 1`,
            fallbackImage: site.image,
            query: getSiteImageQuery(site),
            slot: 1,
          })}
          ${renderDynamicImage({
            alt: `${site.title} photo 2`,
            fallbackImage: site.image,
            query: getSiteImageQuery(site),
            slot: 2,
          })}
        </div>
        <a class="image-credit" href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer">Images : Wikimedia Commons</a>
      </div>
    </article>
  `;
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

  document.querySelector<HTMLDivElement>("#site-list")?.addEventListener("change", (event) => {
    const input = event.target;

    if (!(input instanceof HTMLInputElement) || !input.dataset.siteId) {
      return;
    }

    const completedSites = readCompletedSites();
    if (input.checked) {
      completedSites.add(input.dataset.siteId);
    } else {
      completedSites.delete(input.dataset.siteId);
    }
    localStorage.setItem(completedKey, JSON.stringify([...completedSites]));
  });
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

function readCompletedSites(): Set<string> {
  const rawValue = localStorage.getItem(completedKey);

  if (!rawValue) {
    return new Set();
  }

  try {
    const value = JSON.parse(rawValue);
    return Array.isArray(value) ? new Set(value.filter((item) => typeof item === "string")) : new Set();
  } catch {
    return new Set();
  }
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
  const commonsImage = commonsImages[Number.isFinite(slot) ? slot : 0] ?? commonsImages[0];

  if (!commonsImage) {
    image.src = fallbackImage;
    image.classList.remove("is-loading");
    return;
  }

  image.src = commonsImage.thumbUrl;
  image.dataset.originalImage = commonsImage.originalUrl;
  image.classList.remove("is-loading");
  updateImageCredit(image, commonsImage);
}

async function getCommonsImages(query: string): Promise<CommonsImage[]> {
  const normalizedQuery = normalize(query);
  const cachedImages = readCommonsImageCache(normalizedQuery);

  if (cachedImages) {
    return cachedImages;
  }

  try {
    const response = await fetch(buildCommonsSearchUrl(query));

    if (!response.ok) {
      throw new Error(`Wikimedia Commons a répondu ${response.status}.`);
    }

    const data = (await response.json()) as CommonsApiResponse;
    const images = parseCommonsImages(data);
    writeCommonsImageCache(normalizedQuery, images);
    return images;
  } catch (error) {
    console.warn("Impossible de charger les images Commons", error);
    return [];
  }
}

function buildCommonsSearchUrl(query: string): string {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "8",
    gsrsearch: buildCommonsSearchText(query),
    prop: "imageinfo",
    iiprop: "url|mime|mediatype|extmetadata",
    iiurlwidth: "960",
  });

  return `${commonsApiUrl}?${params.toString()}`;
}

function buildCommonsSearchText(query: string): string {
  const quotedQuery = query.replace(/"/g, "").trim();
  return `intitle:"${quotedQuery}" New York`;
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
        credit: formatImageCredit(imageInfo),
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

function updateImageCredit(image: HTMLImageElement, commonsImage: CommonsImage): void {
  const article = image.closest("article");
  const credit = article?.querySelector<HTMLAnchorElement>(".image-credit");

  if (!credit) {
    return;
  }

  credit.href = commonsImage.descriptionUrl;
  credit.textContent = `Image : ${commonsImage.credit}`;
}

function formatImageCredit(imageInfo: CommonsApiImageInfo): string {
  const license = stripHtml(imageInfo.extmetadata?.LicenseShortName?.value ?? "Wikimedia Commons");
  const artist = stripHtml(imageInfo.extmetadata?.Artist?.value ?? "");

  return artist ? `${artist} · ${license}` : license;
}

function setHeroBackground(hero: HTMLElement, imageUrl: string): void {
  hero.style.backgroundImage = `linear-gradient(180deg, rgba(11, 18, 32, 0.18), rgba(11, 18, 32, 0.8)), url("${imageUrl}")`;
}

function bindImageFallbacks(): void {
  document.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    image.onerror = () => {
      const title = image.alt || "New York";
      image.src = image.dataset.fallbackImage ?? createPlaceholderImage(title);
      image.classList.remove("is-loading");
    };
  });
}

function createPlaceholderImage(title: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0f766e"/><stop offset="1" stop-color="#1f2937"/></linearGradient></defs><rect width="1200" height="700" fill="url(#g)"/><text x="60" y="330" font-family="Arial" font-size="58" fill="white" font-weight="700">${escapeHtml(title)}</text><text x="60" y="410" font-family="Arial" font-size="30" fill="#d1fae5">Recherche d'une photo Commons...</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function stripHtml(value: string): string {
  const element = document.createElement("div");
  element.innerHTML = value;
  return element.textContent?.trim() ?? "";
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
