export interface ImageAttribution {
  creator: string;
  license: string;
  source: string;
}

const imageAttributions: Record<string, ImageAttribution> = {
  "/images/south-africa/cape-town-bo-kaap.jpg": {
    creator: "Lasermanmcgee",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Bo-Kaap,_Cape_Town,_South_Africa.jpg",
  },
  "/images/south-africa/cape-town-harbour.jpg": {
    creator: "HPBotha",
    license: "CC0 1.0",
    source: "https://commons.wikimedia.org/wiki/File:Cape-town-port-boats.jpg",
  },
  "/images/south-africa/kruger-elephant.jpg": {
    creator: "Diego Delso",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Elefante_africano_de_sabana_(Loxodonta_africana),_parque_nacional_Kruger,_Sud%C3%A1frica,_2018-07-25,_DD_19.jpg",
  },
  "/images/south-africa/kruger-giraffe.jpg": {
    creator: "Dietmar Rabich",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Kruger_National_Park_(ZA),_Giraffe_--_2024_--_0431.jpg",
  },
  "/images/south-africa/kapama-game-drive.jpg": {
    creator: "Pierre André Leclercq",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Kapama_Game_Reserve_safari_photo_en_Jeep.jpg",
  },
  "/images/south-africa/johannesburg-skyline.jpg": {
    creator: "Mark Hillary",
    license: "CC BY 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Johannesburg_skyline_2017.jpg",
  },
  "/images/south-africa/cape-winelands-vineyard.jpg": {
    creator: "lumoplank",
    license: "CC0 1.0",
    source: "https://commons.wikimedia.org/wiki/File:Cape_Winelands_-_Stellenbosch3785.jpg",
  },
  "/images/south-africa/garden-route-knysna-forest.jpg": {
    creator: "South African Tourism",
    license: "CC BY 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Knysna_Forest_-_Garden_Route,_South_Africa_(3919268880).jpg",
  },
  "/images/south-africa/namaqualand-flowers.jpg": {
    creator: "Cruithne9",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Namaqualand_flowers_1.JPG",
  },
  "/images/south-africa/blyde-three-rondavels.jpg": {
    creator: "Mmullie (WMF)",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:2017-07-31-panorama-route-three-rondavels.jpg",
  },
  "/images/south-africa/durban-addington-beach.jpg": {
    creator: "South African Tourism",
    license: "CC BY 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Addington_Beach,_Durban,_KwaZulu-Natal,_South_Africa_(19890737254).jpg",
  },
  "/images/south-africa/boulders-beach-penguins.jpg": {
    creator: "Bernard Gagnon",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:African_penguins_at_Boulders_Beach.jpg",
  },
  "/images/south-africa/drakensberg-amphitheatre.jpg": {
    creator: "Bothar",
    license: "Public domain",
    source: "https://commons.wikimedia.org/wiki/File:Amphitheatre_Drakensberg.jpg",
  },
  "/images/south-africa/golden-gate-brandwag-rock.jpg": {
    creator: "Zaian",
    license: "Public domain",
    source: "https://commons.wikimedia.org/wiki/File:Brandwag_rock.JPG",
  },
  "/images/south-africa/pilanesberg-at-dawn.jpg": {
    creator: "Matt Kieffer",
    license: "CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Dawn_at_Pilanesberg_National_Park,_South_Africa.jpg",
  },
  "/images/south-africa/durban-bunny-chow.jpg": {
    creator: "Robert Rutherford",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Durban_Bunny_Chow.jpg",
  },
  "/images/south-africa/soweto-vilakazi-street.jpg": {
    creator: "Nagarjun Kandukuru",
    license: "CC BY 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Homes_on_Mandela%27s_Vilakazi_street.jpg",
  },
  "/images/south-africa/wild-coast-qolora-beach.jpg": {
    creator: "Asdfjrjjj",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Qolora_Wild_Coast_beach_Nov_2018.jpg",
  },
  "/images/south-africa/waterberg-bushveld.jpg": {
    creator: "Covalent",
    license: "Public domain",
    source: "https://commons.wikimedia.org/wiki/File:Waterberg_bushveld.jpg",
  },
};

export function getImageAttribution(src: string) {
  return imageAttributions[src];
}
