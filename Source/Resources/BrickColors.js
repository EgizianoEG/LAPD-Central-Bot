const Colors = [
  {
    hex: "#F2F3F3",
    name: "White",
    number: 1,
  },
  {
    hex: "#A1A5A2",
    name: "Grey",
    number: 2,
  },
  {
    hex: "#F9E999",
    name: "Light Yellow",
    number: 3,
  },
  {
    hex: "#D7C59A",
    name: "Brick Yellow",
    number: 5,
  },
  {
    hex: "#C2DAB8",
    name: "Light Green (Mint)",
    number: 6,
  },
  {
    hex: "#E8BAC8",
    name: "Light Reddish Violet",
    number: 9,
  },
  {
    hex: "#80BBDB",
    name: "Pastel Blue",
    number: 11,
  },
  {
    hex: "#CB8442",
    name: "Light Orange Brown",
    number: 12,
  },
  {
    hex: "#CC8E69",
    name: "Nougat",
    number: 18,
  },
  {
    hex: "#C4281C",
    name: "Bright Red",
    number: 21,
  },
  {
    hex: "#C470A0",
    name: "Med. Reddish Violet",
    number: 22,
  },
  {
    hex: "#0D69AC",
    name: "Bright Blue",
    number: 23,
  },
  {
    hex: "#F5CD30",
    name: "Bright Yellow",
    number: 24,
  },
  {
    hex: "#624732",
    name: "Earth Orange",
    number: 25,
  },
  {
    hex: "#1B2A35",
    name: "Black",
    number: 26,
  },
  {
    hex: "#6D6E6C",
    name: "Dark Grey",
    number: 27,
  },
  {
    hex: "#287F47",
    name: "Dark Green",
    number: 28,
  },
  {
    hex: "#A1C48C",
    name: "Medium Green",
    number: 29,
  },
  {
    hex: "#F3CF9B",
    name: "Lig. Yellowich Orange",
    number: 36,
  },
  {
    hex: "#4B974B",
    name: "Bright Green",
    number: 37,
  },
  {
    hex: "#A05F35",
    name: "Dark Orange",
    number: 38,
  },
  {
    hex: "#C1CADE",
    name: "Light Bluish Violet",
    number: 39,
  },
  {
    hex: "#ECECEC",
    name: "Transparent",
    number: 40,
  },
  {
    hex: "#CD544B",
    name: "Tr. Red",
    number: 41,
  },
  {
    hex: "#C1DFF0",
    name: "Tr. Lg Blue",
    number: 42,
  },
  {
    hex: "#7BB6E8",
    name: "Tr. Blue",
    number: 43,
  },
  {
    hex: "#F7F18D",
    name: "Tr. Yellow",
    number: 44,
  },
  {
    hex: "#B4D2E4",
    name: "Light Blue",
    number: 45,
  },
  {
    hex: "#D9856C",
    name: "Tr. Flu. Reddish Orange",
    number: 47,
  },
  {
    hex: "#84B68D",
    name: "Tr. Green",
    number: 48,
  },
  {
    hex: "#F8F184",
    name: "Tr. Flu. Green",
    number: 49,
  },
  {
    hex: "#ECE8DE",
    name: "Phosph. White",
    number: 50,
  },
  {
    hex: "#EEC4B6",
    name: "Light Red",
    number: 100,
  },
  {
    hex: "#DA867A",
    name: "Medium Red",
    number: 101,
  },
  {
    hex: "#6E99CA",
    name: "Medium Blue",
    number: 102,
  },
  {
    hex: "#C7C1B7",
    name: "Light Grey",
    number: 103,
  },
  {
    hex: "#6B327C",
    name: "Bright Violet",
    number: 104,
  },
  {
    hex: "#E29B40",
    name: "Br. Yellowish Orange",
    number: 105,
  },
  {
    hex: "#DA8541",
    name: "Bright Orange",
    number: 106,
  },
  {
    hex: "#008F9C",
    name: "Bright Bluish Green",
    number: 107,
  },
  {
    hex: "#685C43",
    name: "Earth Yellow",
    number: 108,
  },
  {
    hex: "#435493",
    name: "Bright Bluish Violet",
    number: 110,
  },
  {
    hex: "#BFB7B1",
    name: "Tr. Brown",
    number: 111,
  },
  {
    hex: "#6874AC",
    name: "Medium Bluish Violet",
    number: 112,
  },
  {
    hex: "#E5ADC8",
    name: "Tr. Medi. Reddish Violet",
    number: 113,
  },
  {
    hex: "#C7D23C",
    name: "Med. Yellowish Green",
    number: 115,
  },
  {
    hex: "#55A5AF",
    name: "Med. Bluish Green",
    number: 116,
  },
  {
    hex: "#B7D7D5",
    name: "Light Bluish Green",
    number: 118,
  },
  {
    hex: "#A4BD47",
    name: "Br. Yellowish Green",
    number: 119,
  },
  {
    hex: "#D9E4A7",
    name: "Lig. Yellowish Green",
    number: 120,
  },
  {
    hex: "#E7AC58",
    name: "Med. Yellowish Orange",
    number: 121,
  },
  {
    hex: "#D36F4C",
    name: "Br. Reddish Orange",
    number: 123,
  },
  {
    hex: "#923978",
    name: "Bright Reddish Violet",
    number: 124,
  },
  {
    hex: "#EAB892",
    name: "Light Orange",
    number: 125,
  },
  {
    hex: "#A5A5CB",
    name: "Tr. Bright Bluish Violet",
    number: 126,
  },
  {
    hex: "#DCBC81",
    name: "Gold",
    number: 127,
  },
  {
    hex: "#AE7A59",
    name: "Dark Nougat",
    number: 128,
  },
  {
    hex: "#9CA3A8",
    name: "Silver",
    number: 131,
  },
  {
    hex: "#D5733D",
    name: "Neon Orange",
    number: 133,
  },
  {
    hex: "#D8DD56",
    name: "Neon Green",
    number: 134,
  },
  {
    hex: "#74869D",
    name: "Sand Blue",
    number: 135,
  },
  {
    hex: "#877C90",
    name: "Sand Violet",
    number: 136,
  },
  {
    hex: "#E09864",
    name: "Medium Orange",
    number: 137,
  },
  {
    hex: "#958A73",
    name: "Sand Yellow",
    number: 138,
  },
  {
    hex: "#203A56",
    name: "Earth Blue",
    number: 140,
  },
  {
    hex: "#27462D",
    name: "Earth Green",
    number: 141,
  },
  {
    hex: "#CFE2F7",
    name: "Tr. Flu. Blue",
    number: 143,
  },
  {
    hex: "#7988A1",
    name: "Sand Blue Metallic",
    number: 145,
  },
  {
    hex: "#958EA3",
    name: "Sand Violet Metallic",
    number: 146,
  },
  {
    hex: "#938767",
    name: "Sand Yellow Metallic",
    number: 147,
  },
  {
    hex: "#575857",
    name: "Dark Grey Metallic",
    number: 148,
  },
  {
    hex: "#161D32",
    name: "Black Metallic",
    number: 149,
  },
  {
    hex: "#ABADAC",
    name: "Light Grey Metallic",
    number: 150,
  },
  {
    hex: "#789082",
    name: "Sand Green",
    number: 151,
  },
  {
    hex: "#957977",
    name: "Sand Red",
    number: 153,
  },
  {
    hex: "#7B2E2F",
    name: "Dark Red",
    number: 154,
  },
  {
    hex: "#FFF67B",
    name: "Tr. Flu. Yellow",
    number: 157,
  },
  {
    hex: "#E1A4C2",
    name: "Tr. Flu. Red",
    number: 158,
  },
  {
    hex: "#756C62",
    name: "Gun Metallic",
    number: 168,
  },
  {
    hex: "#97695B",
    name: "Red Flip/flop",
    number: 176,
  },
  {
    hex: "#B48455",
    name: "Yellow Flip/flop",
    number: 178,
  },
  {
    hex: "#898788",
    name: "Silver Flip/flop",
    number: 179,
  },
  {
    hex: "#D7A94B",
    name: "Curry",
    number: 180,
  },
  {
    hex: "#F9D62E",
    name: "Fire Yellow",
    number: 190,
  },
  {
    hex: "#E8AB2D",
    name: "Flame Yellowish Orange",
    number: 191,
  },
  {
    hex: "#694028",
    name: "Reddish Brown",
    number: 192,
  },
  {
    hex: "#CF6024",
    name: "Flame Reddish Orange",
    number: 193,
  },
  {
    hex: "#A3A2A5",
    name: "Medium Stone Grey",
    number: 194,
  },
  {
    hex: "#4667A4",
    name: "Royal Blue",
    number: 195,
  },
  {
    hex: "#23478B",
    name: "Dark Royal Blue",
    number: 196,
  },
  {
    hex: "#8E4285",
    name: "Bright Reddish Lilac",
    number: 198,
  },
  {
    hex: "#635F62",
    name: "Dark Stone Grey",
    number: 199,
  },
  {
    hex: "#828A5D",
    name: "Lemon Metalic",
    number: 200,
  },
  {
    hex: "#E5E4DF",
    name: "Light Stone Grey",
    number: 208,
  },
  {
    hex: "#B08E44",
    name: "Dark Curry",
    number: 209,
  },
  {
    hex: "#709578",
    name: "Faded Green",
    number: 210,
  },
  {
    hex: "#79B5B5",
    name: "Turquoise",
    number: 211,
  },
  {
    hex: "#9FC3E9",
    name: "Light Royal Blue",
    number: 212,
  },
  {
    hex: "#6C81B7",
    name: "Medium Royal Blue",
    number: 213,
  },
  {
    hex: "#904C2A",
    name: "Rust",
    number: 216,
  },
  {
    hex: "#7C5C46",
    name: "Brown",
    number: 217,
  },
  {
    hex: "#96709F",
    name: "Reddish Lilac",
    number: 218,
  },
  {
    hex: "#6B629B",
    name: "Lilac",
    number: 219,
  },
  {
    hex: "#A7A9CE",
    name: "Light Lilac",
    number: 220,
  },
  {
    hex: "#CD6298",
    name: "Bright Purple",
    number: 221,
  },
  {
    hex: "#E4ADC8",
    name: "Light Purple",
    number: 222,
  },
  {
    hex: "#DC9095",
    name: "Light Pink",
    number: 223,
  },
  {
    hex: "#F0D5A0",
    name: "Light Brick Yellow",
    number: 224,
  },
  {
    hex: "#EBB87F",
    name: "Warm Yellowish Orange",
    number: 225,
  },
  {
    hex: "#FDEA8D",
    name: "Cool Yellow",
    number: 226,
  },
  {
    hex: "#7DBBDD",
    name: "Dove Blue",
    number: 232,
  },
  {
    hex: "#342B75",
    name: "Medium Lilac",
    number: 268,
  },
  {
    hex: "#506D54",
    name: "Slime Green",
    number: 301,
  },
  {
    hex: "#5B5D69",
    name: "Smoky Grey",
    number: 302,
  },
  {
    hex: "#0010B0",
    name: "Dark Blue",
    number: 303,
  },
  {
    hex: "#2C651D",
    name: "Parsley Green",
    number: 304,
  },
  {
    hex: "#527CAE",
    name: "Steel Blue",
    number: 305,
  },
  {
    hex: "#335882",
    name: "Storm Blue",
    number: 306,
  },
  {
    hex: "#102ADC",
    name: "Lapis",
    number: 307,
  },
  {
    hex: "#3D1585",
    name: "Dark Indigo",
    number: 308,
  },
  {
    hex: "#348E40",
    name: "Sea Green",
    number: 309,
  },
  {
    hex: "#5B9A4C",
    name: "Shamrock",
    number: 310,
  },
  {
    hex: "#9FA1AC",
    name: "Fossil",
    number: 311,
  },
  {
    hex: "#592259",
    name: "Mulberry",
    number: 312,
  },
  {
    hex: "#1F801D",
    name: "Forest Green",
    number: 313,
  },
  {
    hex: "#9FADC0",
    name: "Cadet Blue",
    number: 314,
  },
  {
    hex: "#0989CF",
    name: "Electric Blue",
    number: 315,
  },
  {
    hex: "#7B007B",
    name: "Eggplant",
    number: 316,
  },
  {
    hex: "#7C9C6B",
    name: "Moss",
    number: 317,
  },
  {
    hex: "#8AAB85",
    name: "Artichoke",
    number: 318,
  },
  {
    hex: "#B9C4B1",
    name: "Sage Green",
    number: 319,
  },
  {
    hex: "#CACBD1",
    name: "Ghost Grey",
    number: 320,
  },
  {
    hex: "#A75E9B",
    name: "Lilac",
    number: 321,
  },
  {
    hex: "#7B2F7B",
    name: "Plum",
    number: 322,
  },
  {
    hex: "#94BE81",
    name: "Olivine",
    number: 323,
  },
  {
    hex: "#A8BD99",
    name: "Laurel Green",
    number: 324,
  },
  {
    hex: "#DFDFDE",
    name: "Quill Grey",
    number: 325,
  },
  {
    hex: "#970000",
    name: "Crimson",
    number: 327,
  },
  {
    hex: "#B1E5A6",
    name: "Mint",
    number: 328,
  },
  {
    hex: "#98C2DB",
    name: "Baby Blue",
    number: 329,
  },
  {
    hex: "#FF98DC",
    name: "Carnation Pink",
    number: 330,
  },
  {
    hex: "#FF5959",
    name: "Persimmon",
    number: 331,
  },
  {
    hex: "#750000",
    name: "Maroon",
    number: 332,
  },
  {
    hex: "#EFB838",
    name: "Gold",
    number: 333,
  },
  {
    hex: "#F8D96D",
    name: "Daisy Orange",
    number: 334,
  },
  {
    hex: "#E7E7EC",
    name: "Pearl",
    number: 335,
  },
  {
    hex: "#C7D4E4",
    name: "Fog",
    number: 336,
  },
  {
    hex: "#FF9494",
    name: "Salmon",
    number: 337,
  },
  {
    hex: "#BE6862",
    name: "Terra Cotta",
    number: 338,
  },
  {
    hex: "#562424",
    name: "Cocoa",
    number: 339,
  },
  {
    hex: "#F1E7C7",
    name: "Wheat",
    number: 340,
  },
  {
    hex: "#FEF3BB",
    name: "Buttermilk",
    number: 341,
  },
  {
    hex: "#E0B2D0",
    name: "Mauve",
    number: 342,
  },
  {
    hex: "#D490BD",
    name: "Sunrise",
    number: 343,
  },
  {
    hex: "#965555",
    name: "Tawny",
    number: 344,
  },
  {
    hex: "#8F4C2A",
    name: "Rust",
    number: 345,
  },
  {
    hex: "#D3BE96",
    name: "Cashmere",
    number: 346,
  },
  {
    hex: "#E2DCBC",
    name: "Khaki",
    number: 347,
  },
  {
    hex: "#EDEAEA",
    name: "Lily White",
    number: 348,
  },
  {
    hex: "#E9DADA",
    name: "Seashell",
    number: 349,
  },
  {
    hex: "#883E3E",
    name: "Burgundy",
    number: 350,
  },
  {
    hex: "#BC9B5D",
    name: "Cork",
    number: 351,
  },
  {
    hex: "#C7AC78",
    name: "Burlap",
    number: 352,
  },
  {
    hex: "#CABFA3",
    name: "Beige",
    number: 353,
  },
  {
    hex: "#BBB3B2",
    name: "Oyster",
    number: 354,
  },
  {
    hex: "#6C584B",
    name: "Pine Cone",
    number: 355,
  },
  {
    hex: "#A0844F",
    name: "Fawn Brown",
    number: 356,
  },
  {
    hex: "#958988",
    name: "Hurricane Grey",
    number: 357,
  },
  {
    hex: "#ABA89E",
    name: "Cloudy Grey",
    number: 358,
  },
  {
    hex: "#AF9483",
    name: "Linen",
    number: 359,
  },
  {
    hex: "#966766",
    name: "Copper",
    number: 360,
  },
  {
    hex: "#564236",
    name: "Medium Brown",
    number: 361,
  },
  {
    hex: "#7E683F",
    name: "Bronze",
    number: 362,
  },
  {
    hex: "#69665C",
    name: "Flint",
    number: 363,
  },
  {
    hex: "#5A4C42",
    name: "Dark Taupe",
    number: 364,
  },
  {
    hex: "#6A3909",
    name: "Burnt Sienna",
    number: 365,
  },
  {
    hex: "#F8F8F8",
    name: "Institutional White",
    number: 1001,
  },
  {
    hex: "#CDCDCD",
    name: "Mid Gray",
    number: 1002,
  },
  {
    hex: "#111111",
    name: "Really Black",
    number: 1003,
  },
  {
    hex: "#FF0000",
    name: "Really Red",
    number: 1004,
  },
  {
    hex: "#FFB000",
    name: "Deep Orange",
    number: 1005,
  },
  {
    hex: "#B480FF",
    name: "Alder",
    number: 1006,
  },
  {
    hex: "#A34B4B",
    name: "Dusty Rose",
    number: 1007,
  },
  {
    hex: "#C1BE42",
    name: "Olive",
    number: 1008,
  },
  {
    hex: "#FFFF00",
    name: "New Yeller",
    number: 1009,
  },
  {
    hex: "#0000FF",
    name: "Really Blue",
    number: 1010,
  },
  {
    hex: "#002060",
    name: "Navy Blue",
    number: 1011,
  },
  {
    hex: "#2154B9",
    name: "Deep Blue",
    number: 1012,
  },
  {
    hex: "#04AFEC",
    name: "Cyan",
    number: 1013,
  },
  {
    hex: "#AA5500",
    name: "Cga Brown",
    number: 1014,
  },
  {
    hex: "#AA00AA",
    name: "Magenta",
    number: 1015,
  },
  {
    hex: "#FF66CC",
    name: "Pink",
    number: 1016,
  },
  {
    hex: "#FFAF00",
    name: "Deep Orange",
    number: 1017,
  },
  {
    hex: "#12EED4",
    name: "Teal",
    number: 1018,
  },
  {
    hex: "#00FFFF",
    name: "Toothpaste",
    number: 1019,
  },
  {
    hex: "#00FF00",
    name: "Lime Green",
    number: 1020,
  },
  {
    hex: "#3A7D15",
    name: "Camo",
    number: 1021,
  },
  {
    hex: "#7F8E64",
    name: "Grime",
    number: 1022,
  },
  {
    hex: "#8C5B9F",
    name: "Lavender",
    number: 1023,
  },
  {
    hex: "#AFDDFF",
    name: "Pastel Light Blue",
    number: 1024,
  },
  {
    hex: "#FFC9C9",
    name: "Pastel Orange",
    number: 1025,
  },
  {
    hex: "#B1A7FF",
    name: "Pastel Violet",
    number: 1026,
  },
  {
    hex: "#9FF3E9",
    name: "Pastel Blue-Green",
    number: 1027,
  },
  {
    hex: "#CCFFCC",
    name: "Pastel Green",
    number: 1028,
  },
  {
    hex: "#FFFFCC",
    name: "Pastel Yellow",
    number: 1029,
  },
  {
    hex: "#FFCC99",
    name: "Pastel Brown",
    number: 1030,
  },
  {
    hex: "#6225D1",
    name: "Royal Purple",
    number: 1031,
  },
  {
    hex: "#FF00BF",
    name: "Hot Pink",
    number: 1032,
  },
];

module.exports = Colors;
