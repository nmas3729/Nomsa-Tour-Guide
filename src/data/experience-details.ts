import { experiences, guides } from "@/src/data/public-site";

export interface ExperienceDetailData {
  slug: string;
  title: string;
  tagline?: string;
  destination: string;
  province: string;
  category: string;
  price: number;
  rating: number;
  reviewCount: number;
  duration: string;
  groupSize?: string;
  languages?: string[];
  images: Array<{
    url: string;
    caption: string;
  }>;
  overview?: string;
  highlights: string[];
  included: string[];
  excluded: string[];
  itinerary: Array<{
    time?: string;
    title: string;
    description: string;
  }>;
  meetingPoint?: {
    name: string;
    address: string;
    notes: string;
    coordinates: string;
  };
  guideSlug?: string;
  cancellationPolicy?: string;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  reviews: Array<{
    id: string;
    name: string;
    country: string;
    avatar?: string;
    rating: number;
    date: string;
    comment: string;
    helpfulCount: number;
  }>;
}

export const detailedExperiences: Record<string, ExperienceDetailData> = {
  "bo-kaap-local-walk": {
    slug: "bo-kaap-local-walk",
    title: "A local's walk through Bo-Kaap & heritage spices",
    tagline: "Stroll pastel cobbles, taste warm koesisters, and uncover 300 years of Cape Malay living heritage with a neighbourhood resident.",
    destination: "Cape Town",
    province: "Western Cape",
    category: "Culture",
    price: 650,
    rating: 4.9,
    reviewCount: 86,
    duration: "2.5 hours",
    groupSize: "Max 10 guests",
    languages: ["English", "isiXhosa", "Afrikaans"],
    images: [
      {
        url: "/images/south-africa/cape-town-bo-kaap.jpg",
        caption: "Bo-Kaap houses with Lion's Head and Table Mountain in the background",
      },
      {
        url: "/images/south-africa/cape-town-harbour.jpg",
        caption: "Cape Town harbour and Table Mountain",
      },
    ],
    overview:
      "Step past the postcard photographs and discover Bo-Kaap through the living memory of those who grew up in its vibrant homes. Guided by Thandi, you'll hear the origins of Cape Malay traditions, visit the historic Auwal Mosque (the oldest in Southern Africa), grind roasted spices by hand at Atlas Trading, and enjoy homemade treats in a private courtyard.",
    highlights: [
      "Guided walk through iconic cobblestone streets with local heritage storytelling",
      "Private spice blending session and aroma masterclass at Atlas Trading",
      "Traditional Cape Malay tasting including warm koesisters, dhaltjies, and fresh rooibos tea",
      "Visit to the historic Auwal Mosque and community heritage museum",
      "Personal stories of neighborhood resilience, gentrification, and Cape Muslim culture",
    ],
    included: [
      "Local heritage guide",
      "All food and beverage tastings (koesisters, samosas, spiced tea)",
      "Spice sample gift pouch to take home",
      "Admission to local community heritage museum",
      "Small-group intimacy (max 10 guests)",
    ],
    excluded: [
      "Hotel pickup and drop-off (meeting at central Bo-Kaap landmark)",
      "Alcoholic beverages (halal neighbourhood experience)",
      "Personal purchases at spice merchants",
      "Discretionary guide gratuities",
    ],
    itinerary: [
      {
        time: "10:00 AM",
        title: "Meet at Wale Street Museum Plaza",
        description: "Orientation, neighborhood history timeline, and cultural context beneath Table Mountain.",
      },
      {
        time: "10:45 AM",
        title: "Atlas Trading Spice Masterclass",
        description: "Engage your senses at an iconic family spice shop dating back to 1946; blend your own garam masala.",
      },
      {
        time: "11:30 AM",
        title: "Cobblestone Pathways & Architectural Tales",
        description: "Explore Rose and Chiappini Streets, discovering why the houses were painted in vibrant liberation colours.",
      },
      {
        time: "12:15 PM",
        title: "Private Courtyard Tasting & Story Circle",
        description: "Sip spiced rooibos and savor freshly fried koesisters while discussing the community's future.",
      },
    ],
    meetingPoint: {
      name: "Bo-Kaap Museum Courtyard",
      address: "71 Wale Street, Schotsche Kloof, Cape Town, 8001",
      notes: "Look for your guide holding the Nomsa green insignia. Free street parking is available along Rose Street.",
      coordinates: "-33.9221° S, 18.4168° E",
    },
    guideSlug: "thandi-mokoena",
    cancellationPolicy: "Contact Nomsa Tour Guides to confirm the cancellation terms for this experience.",
    faqs: [
      {
        question: "Is this tour suitable for children and families?",
        answer: "Absolutely. The walking pace is gentle, with plenty of shade stops and sweet culinary treats that children love.",
      },
      {
        question: "What should I wear?",
        answer: "Comfortable walking shoes are recommended for the historic cobblestones. Since we visit sacred spaces, modest dress (covered shoulders and knees) is respectful.",
      },
      {
        question: "Are the food tastings Halal?",
        answer: "If halal certification is important to you, contact Nomsa Tour Guides before booking to confirm the food and drink details.",
      },
      {
        question: "What happens if it rains?",
        answer: "Contact Nomsa Tour Guides before booking to confirm arrangements for severe weather.",
      },
    ],
    reviews: [
      {
        id: "r1",
        name: "Sophie Laurent",
        country: "France",
        rating: 5,
        date: "September 2026",
        comment:
          "Thandi is an extraordinary human being. She doesn't just recite facts; she connects you to the soul of her neighbours. The spice blending and warm koesisters were divine!",
        helpfulCount: 24,
      },
      {
        id: "r2",
        name: "David & Sarah Miller",
        country: "United Kingdom",
        rating: 5,
        date: "August 2026",
        comment:
          "Easily the highlight of our Cape Town stay. Way better than walking around alone snapping selfies. You leave with genuine understanding and deep respect.",
        helpfulCount: 18,
      },
      {
        id: "r3",
        name: "Kwanele Zulu",
        country: "South Africa",
        rating: 5,
        date: "July 2026",
        comment:
          "Even as a South African from Durban, I learned so much about the Cape Malay community. Authentic, warm, and delightfully tasty.",
        helpfulCount: 12,
      },
    ],
  },
  "greater-kruger-sunrise-safari": {
    slug: "greater-kruger-sunrise-safari",
    title: "Sunrise Big 5 game drive in Greater Kruger",
    tagline: "Track lions, leopards, and herds of wild elephants as the African dawn paints the bushveld golden.",
    destination: "Kruger National Park",
    province: "Mpumalanga & Limpopo",
    category: "Safari",
    price: 1850,
    rating: 5.0,
    reviewCount: 54,
    duration: "5 hours",
    groupSize: "Max 8 guests",
    languages: ["English", "siSwati", "Tsonga"],
    images: [
      {
        url: "/images/south-africa/kruger-elephant.jpg",
        caption: "African bush elephant in Kruger National Park",
      },
      {
        url: "/images/south-africa/kapama-game-drive.jpg",
        caption: "Safari vehicle and guests in Kapama Game Reserve, in the Greater Kruger region",
      },
      {
        url: "/images/south-africa/kruger-giraffe.jpg",
        caption: "Giraffe near Skukuza in Kruger National Park",
      },
    ],
    overview:
      "Join senior tracker Sipho Ndlovu on a private open-vehicle safari through Greater Kruger's unfenced wilderness. As the nocturnal bush quietens, nocturnal predators give way to grazing rhino, giraffes browsing acacia canopies, and bird migrations. Sipho's 12+ years of animal behavioral knowledge ensures ethical, thrilling, and respectful wildlife encounters.",
    highlights: [
      "Open-top safari vehicle with tiered seating",
      "Led by Sipho Ndlovu, with a focus on respectful wildlife observation",
      "Trackers search for Big Five wildlife across the reserve; sightings vary",
      "Traditional bush tea, roasted filter coffee, and homemade rusks served in the wild",
      "Professional spotting scopes and high-definition binoculars provided",
    ],
    included: [
      "Local wildlife tracker and guide",
      "Open 4x4 safari vehicle and conservation park fees",
      "Morning tea, artisanal coffee, rusks, and mineral water",
      "Binoculars and wildlife identification checklists",
    ],
    excluded: [
      "Lodge transfers outside the Hazyview/Hoedspruit perimeter",
      "Heavy lunch (morning snacks only)",
      "Personal optical photography gear",
      "Optional gratuity for tracker and guide",
    ],
    itinerary: [
      {
        time: "05:00 AM",
        title: "Dawn Rendezvous & Safety Briefing",
        description: "Board the safari cruiser, sip a warm wake-up beverage, and receive tracking orientation.",
      },
      {
        time: "05:45 AM",
        title: "Sunrise Spoor & Track Analysis",
        description: "Search for fresh leopard and lion tracks pressed into the morning sand.",
      },
      {
        time: "07:30 AM",
        title: "Leadwood Tree Coffee Break",
        description: "Stretch your legs in a safe panoramic bush opening with hot coffee and South African rusks.",
      },
      {
        time: "08:15 AM",
        title: "Waterhole & River Basin Exploration",
        description: "Observe bathing elephants, hippo pods, and predatory bird life along riverbanks.",
      },
    ],
    meetingPoint: {
      name: "Phabeni Gate Visitors Pavillion",
      address: "R536, Kruger National Park Concession, Hazyview, 1242",
      notes: "Arrive 15 minutes before dawn. Secure vehicle parking and clean restroom facilities available.",
      coordinates: "-25.0252° S, 31.2405° E",
    },
    guideSlug: "sipho-ndlovu",
    cancellationPolicy: "Contact Nomsa Tour Guides to confirm the cancellation terms for this experience.",
    faqs: [
      {
        question: "What should I wear on a sunrise drive?",
        answer: "Mornings in the open safari vehicle can be quite chilly before the sun crests. Bring layers, a warm fleece or windbreaker, and neutral bush tones (khaki, green, beige).",
      },
      {
        question: "Will we see the Big Five?",
        answer: "Wildlife sightings cannot be guaranteed. Trackers look for signs of animal activity, but wildlife moves freely across the reserve.",
      },
    ],
    reviews: [
      {
        id: "k1",
        name: "Lukas & Greta Weber",
        country: "Germany",
        rating: 5,
        date: "October 2026",
        comment:
          "Sipho is a wizard. He smelled wild sage, stopped the cruiser, and ten seconds later a female leopard walked right past us. Unbelievable respect for the animals.",
        helpfulCount: 31,
      },
    ],
  },
};

export function getExperienceDetail(slug: string): ExperienceDetailData | null {
  if (detailedExperiences[slug]) {
    return detailedExperiences[slug];
  }

  const listing = experiences.find((experience) => experience.slug === slug);

  if (!listing) {
    return null;
  }

  const guide = guides.find((candidate) => candidate.name === listing.guide.name);

  return {
    slug,
    title: listing.title,
    destination: listing.destination,
    province: listing.provinces.join(" & "),
    category: listing.category,
    price: listing.price,
    rating: listing.rating,
    reviewCount: listing.reviewCount,
    duration: listing.duration,
    languages: guide?.languages,
    images: [
      {
        url: listing.image,
        caption: listing.imageDescription ?? listing.title,
      },
    ],
    highlights: [],
    included: [],
    excluded: [],
    itinerary: [],
    guideSlug: guide?.slug,
    faqs: [],
    reviews: [],
  };
}
