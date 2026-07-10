import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { fixieColors, fixieShadows } from "../../lib/fixie-theme";
import CustomerBottomNav from "./components/CustomerBottomNav";

const SAVED_IDEAS_KEY = "fixie-saved-inspiration-ideas";
const CUSTOM_IDEAS_KEY = "fixie-custom-inspiration-ideas";

const AREAS = [
  { label: "All", icon: "grid-outline", keywords: [] },
  { label: "Kitchen", icon: "restaurant-outline", keywords: ["kitchen", "cabinet", "counter", "backsplash"] },
  { label: "Bathroom", icon: "water-outline", keywords: ["bathroom", "vanity", "shower", "tile"] },
  { label: "Backyard", icon: "leaf-outline", keywords: ["backyard", "patio", "deck", "garden", "outdoor"] },
  { label: "Living Room", icon: "albums-outline", keywords: ["living", "fireplace", "built-in"] },
  { label: "Bedroom", icon: "bed-outline", keywords: ["bedroom", "closet"] },
  { label: "Entryway", icon: "home-outline", keywords: ["entry", "mudroom", "foyer"] },
  { label: "Laundry", icon: "shirt-outline", keywords: ["laundry", "utility"] },
];

const BOARDS = [
  { label: "All Ideas", icon: "sparkles-outline", type: "all", keywords: [] },
  { label: "Saved", icon: "heart-outline", type: "saved", keywords: [] },
  { label: "Quick Wins", icon: "flash-outline", type: "keyword", keywords: ["paint", "hardware", "mirror", "lighting", "shelving"] },
  { label: "Big Remodels", icon: "construct-outline", type: "keyword", keywords: ["cabinet", "counter", "shower", "deck", "tile", "built-in"] },
  { label: "Outdoor", icon: "leaf-outline", type: "keyword", keywords: ["backyard", "patio", "deck", "garden", "outdoor", "pool"] },
];

const INSPIRATION_IDEAS = [
  {
    id: "kitchen-warm-modern",
    area: "Kitchen",
    title: "Warm modern kitchen",
    style: "Modern",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
    description: "Flat-front cabinets, warm wood, soft under-cabinet lighting, and a clean stone backsplash.",
    projectNotes: ["Cabinet refacing or replacement", "Quartz or stone-look countertop", "Under-cabinet electrical and lighting"],
    tags: ["cabinet", "counter", "backsplash", "lighting"],
  },
  {
    id: "kitchen-cottage",
    area: "Kitchen",
    title: "Cottage kitchen refresh",
    style: "Classic",
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80",
    description: "Painted cabinets, brass hardware, open shelving, and a bright backsplash for a lighter kitchen.",
    projectNotes: ["Cabinet painting", "Hardware swap", "Tile backsplash"],
    tags: ["paint", "hardware", "tile", "shelving"],
  },
  {
    id: "bathroom-spa",
    area: "Bathroom",
    title: "Spa-style bathroom",
    style: "Minimal",
    image: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=900&q=80",
    description: "Large-format tile, frameless glass, matte fixtures, and calm storage make the room feel larger.",
    projectNotes: ["Shower tile", "Glass enclosure", "Vanity and fixture install"],
    tags: ["bathroom", "shower", "tile", "vanity"],
  },
  {
    id: "bathroom-bold-tile",
    area: "Bathroom",
    title: "Bold powder room",
    style: "Statement",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=900&q=80",
    description: "Pattern tile, rich wall color, and a compact vanity can turn a small bath into a focal point.",
    projectNotes: ["Floor tile", "Painting", "Vanity plumbing"],
    tags: ["powder", "paint", "tile", "plumbing"],
  },
  {
    id: "backyard-patio",
    area: "Backyard",
    title: "Layered patio lounge",
    style: "Outdoor",
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80",
    description: "Pavers, seating zones, planters, and lighting create an outdoor room that works after sunset.",
    projectNotes: ["Paver patio", "Low-voltage lighting", "Planter beds"],
    tags: ["backyard", "patio", "pavers", "lighting"],
  },
  {
    id: "backyard-deck",
    area: "Backyard",
    title: "Deck and dining zone",
    style: "Outdoor",
    image: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=900&q=80",
    description: "A defined deck, shade, and simple rail lighting make outdoor meals easier and more polished.",
    projectNotes: ["Deck repair or build", "Stain or seal", "Exterior lighting"],
    tags: ["deck", "dining", "stain", "outdoor"],
  },
  {
    id: "living-builtins",
    area: "Living Room",
    title: "Built-in media wall",
    style: "Custom",
    image: "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=900&q=80",
    description: "Built-ins, concealed cable routing, and warm shelves add storage without making the room busy.",
    projectNotes: ["Custom carpentry", "Electrical relocation", "Paint finish"],
    tags: ["living", "built-in", "media", "carpentry"],
  },
  {
    id: "living-fireplace",
    area: "Living Room",
    title: "Fireplace refresh",
    style: "Classic",
    image: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80",
    description: "New surround material, a clean mantle, and balanced lighting can update the main gathering space.",
    projectNotes: ["Tile or stone surround", "Mantle carpentry", "Accent lighting"],
    tags: ["fireplace", "tile", "stone", "lighting"],
  },
  {
    id: "bedroom-calm",
    area: "Bedroom",
    title: "Calm primary bedroom",
    style: "Soft Modern",
    image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=900&q=80",
    description: "Layered neutrals, wall sconces, and a built-out headboard wall make the room feel finished.",
    projectNotes: ["Accent wall", "Sconce wiring", "Trim or paneling"],
    tags: ["bedroom", "paint", "lighting", "trim"],
  },
  {
    id: "entry-mudroom",
    area: "Entryway",
    title: "Hardworking mudroom",
    style: "Storage",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80",
    description: "Bench seating, hooks, cubbies, and durable flooring keep the daily drop zone organized.",
    projectNotes: ["Bench carpentry", "Storage cubbies", "Durable flooring"],
    tags: ["entry", "mudroom", "storage", "flooring"],
  },
  {
    id: "laundry-utility",
    area: "Laundry",
    title: "Laundry room upgrade",
    style: "Utility",
    image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80",
    description: "A counter over machines, upper cabinets, and better task lighting turn laundry into a smoother routine.",
    projectNotes: ["Countertop install", "Cabinet mounting", "Utility sink plumbing"],
    tags: ["laundry", "counter", "cabinet", "plumbing"],
  },
  {
    id: "backyard-garden",
    area: "Backyard",
    title: "Raised garden corner",
    style: "Garden",
    image: "https://images.unsplash.com/photo-1598902108854-10e335adac99?auto=format&fit=crop&w=900&q=80",
    description: "Raised beds, gravel paths, and drip irrigation make a backyard garden easier to maintain.",
    projectNotes: ["Raised beds", "Irrigation", "Gravel or mulch paths"],
    tags: ["garden", "raised beds", "irrigation", "landscaping"],
  },
  {
    id: "kitchen-dark-cabinets",
    area: "Kitchen",
    title: "Dark cabinet contrast",
    style: "Modern",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
    description: "Deep cabinets, pale counters, and simple hardware create a sharp high-contrast kitchen.",
    projectNotes: ["Cabinet painting", "Countertop update", "Hardware install"],
    tags: ["kitchen", "cabinet", "modern", "hardware"],
  },
  {
    id: "kitchen-open-shelves",
    area: "Kitchen",
    title: "Open shelf wall",
    style: "Light",
    image: "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?auto=format&fit=crop&w=900&q=80",
    description: "Open shelves, clean tile, and simple lighting make everyday items part of the design.",
    projectNotes: ["Shelving", "Tile backsplash", "Wall repair"],
    tags: ["kitchen", "shelving", "backsplash", "tile"],
  },
  {
    id: "kitchen-island-lighting",
    area: "Kitchen",
    title: "Statement island lights",
    style: "Polished",
    image: "https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?auto=format&fit=crop&w=900&q=80",
    description: "Pendant lighting and a strong island anchor the room and create a natural gathering zone.",
    projectNotes: ["Pendant lighting", "Island paint", "Electrical work"],
    tags: ["kitchen", "island", "lighting", "electrical"],
  },
  {
    id: "bathroom-marble",
    area: "Bathroom",
    title: "Marble-look bath",
    style: "Elegant",
    image: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=900&q=80",
    description: "Marble-look surfaces, clean glass, and simple fixtures give the bath a crisp hotel feel.",
    projectNotes: ["Large tile install", "Shower glass", "Fixture replacement"],
    tags: ["bathroom", "marble", "shower", "tile"],
  },
  {
    id: "bathroom-small-vanity",
    area: "Bathroom",
    title: "Compact vanity idea",
    style: "Small Space",
    image: "https://images.unsplash.com/photo-1595514535415-dae8970c520f?auto=format&fit=crop&w=900&q=80",
    description: "A compact vanity, bright mirror, and clear floor space help a small bathroom breathe.",
    projectNotes: ["Vanity install", "Mirror lighting", "Plumbing connection"],
    tags: ["bathroom", "small", "vanity", "mirror"],
  },
  {
    id: "bathroom-walk-in",
    area: "Bathroom",
    title: "Walk-in shower",
    style: "Clean",
    image: "https://images.unsplash.com/photo-1604709177225-055f99402ea3?auto=format&fit=crop&w=900&q=80",
    description: "A low-threshold shower with wall niches and simple tile keeps the space practical and open.",
    projectNotes: ["Shower pan", "Tile niche", "Plumbing rough-in"],
    tags: ["bathroom", "walk-in", "shower", "tile"],
  },
  {
    id: "backyard-firepit",
    area: "Backyard",
    title: "Fire pit seating",
    style: "Outdoor",
    image: "https://images.unsplash.com/photo-1600210491369-e753d80a41f3?auto=format&fit=crop&w=900&q=80",
    description: "A fire pit, gravel base, and simple seating turn an open corner into a hangout spot.",
    projectNotes: ["Fire pit base", "Gravel pad", "Landscape lighting"],
    tags: ["backyard", "fire pit", "gravel", "seating"],
  },
  {
    id: "backyard-string-lights",
    area: "Backyard",
    title: "String light patio",
    style: "Cozy",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    description: "String lights, planters, and an outdoor rug can make a simple patio feel intentional.",
    projectNotes: ["Light posts", "Exterior outlets", "Planter layout"],
    tags: ["backyard", "patio", "string lights", "outdoor"],
  },
  {
    id: "backyard-pool-edge",
    area: "Backyard",
    title: "Poolside refresh",
    style: "Resort",
    image: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=80",
    description: "Clean decking, loungers, and simple planting can make a pool area feel more finished.",
    projectNotes: ["Deck surface", "Drainage check", "Planting beds"],
    tags: ["backyard", "pool", "deck", "landscaping"],
  },
  {
    id: "living-reading-corner",
    area: "Living Room",
    title: "Reading corner",
    style: "Cozy",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80",
    description: "A chair, wall light, soft rug, and shelving can turn an empty corner into a daily-use spot.",
    projectNotes: ["Sconce install", "Shelf mounting", "Paint touch-up"],
    tags: ["living", "reading", "shelves", "lighting"],
  },
  {
    id: "living-neutral",
    area: "Living Room",
    title: "Neutral living room",
    style: "Calm",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
    description: "Simple furniture placement, warm paint, and balanced lighting make the room feel settled.",
    projectNotes: ["Paint", "Lighting", "Trim repair"],
    tags: ["living", "neutral", "paint", "lighting"],
  },
  {
    id: "living-accent-wall",
    area: "Living Room",
    title: "Paneled accent wall",
    style: "Custom",
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=80",
    description: "Wall paneling adds depth behind a sofa or media setup without a full remodel.",
    projectNotes: ["Trim carpentry", "Caulk and paint", "Outlet adjustments"],
    tags: ["living", "paneling", "trim", "paint"],
  },
  {
    id: "bedroom-closet",
    area: "Bedroom",
    title: "Closet organization",
    style: "Storage",
    image: "https://images.unsplash.com/photo-1617104678098-de229db51175?auto=format&fit=crop&w=900&q=80",
    description: "Built-in shelves, drawers, and better lighting make closet storage easier to use.",
    projectNotes: ["Closet system", "Lighting", "Wall patching"],
    tags: ["bedroom", "closet", "storage", "lighting"],
  },
  {
    id: "bedroom-wall-panel",
    area: "Bedroom",
    title: "Headboard wall",
    style: "Custom",
    image: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=900&q=80",
    description: "A paneled wall behind the bed adds structure and makes the room feel designed.",
    projectNotes: ["Panel trim", "Paint", "Outlet planning"],
    tags: ["bedroom", "headboard", "trim", "paint"],
  },
  {
    id: "entry-console",
    area: "Entryway",
    title: "Simple entry console",
    style: "Welcoming",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80",
    description: "A console, mirror, hooks, and durable finish make the first few steps inside feel organized.",
    projectNotes: ["Mirror hanging", "Hook rail", "Wall paint"],
    tags: ["entry", "mirror", "hooks", "paint"],
  },
  {
    id: "entry-tile-floor",
    area: "Entryway",
    title: "Pattern tile entry",
    style: "Statement",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80",
    description: "A durable tile landing adds personality while handling shoes, water, and daily traffic.",
    projectNotes: ["Floor tile", "Transition strip", "Baseboard repair"],
    tags: ["entry", "tile", "flooring", "foyer"],
  },
  {
    id: "laundry-stacked",
    area: "Laundry",
    title: "Stacked laundry station",
    style: "Compact",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80",
    description: "Stacked machines, vertical storage, and a folding surface help small laundry areas work harder.",
    projectNotes: ["Stacking kit", "Cabinet install", "Vent and hose check"],
    tags: ["laundry", "stacked", "storage", "utility"],
  },
  {
    id: "laundry-cabinets",
    area: "Laundry",
    title: "Upper cabinet storage",
    style: "Organized",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80",
    description: "Upper cabinets hide supplies and make a laundry room feel cleaner immediately.",
    projectNotes: ["Cabinet mounting", "Wall blocking", "Counter surface"],
    tags: ["laundry", "cabinet", "storage", "counter"],
  },
];

const EXTRA_IMAGE_IDEAS = [
  ["modern-house-entry", "Entryway", "Modern front entry", "Curb Appeal", "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80", "Clean exterior lines, warm lighting, and a defined entry make the home feel more polished.", ["Exterior lighting", "Door hardware", "Entry landscaping"], ["entry", "exterior", "lighting", "curb appeal"]],
  ["bright-home-office", "Living Room", "Built-in work nook", "Custom", "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80", "A compact work zone with shelving and task lighting adds function without taking over the room.", ["Shelf install", "Task lighting", "Outlet planning"], ["office", "built-in", "lighting", "shelving"]],
  ["white-kitchen-run", "Kitchen", "Clean galley kitchen", "Minimal", "https://images.unsplash.com/photo-1560184897-ae75f418493e?auto=format&fit=crop&w=900&q=80", "Simple cabinetry, bright counters, and an efficient layout make a narrow kitchen feel larger.", ["Cabinet update", "Counter refresh", "Lighting check"], ["kitchen", "cabinet", "counter", "lighting"]],
  ["open-living-glass", "Living Room", "Airy living space", "Modern", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2e?auto=format&fit=crop&w=900&q=80", "Large windows, clean seating, and balanced lighting keep the room open and usable.", ["Window trim", "Paint", "Lighting"], ["living", "windows", "paint", "lighting"]],
  ["cozy-bedroom-layers", "Bedroom", "Layered bedroom refresh", "Cozy", "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80", "Soft layers, warm lamps, and a calm wall color make the bedroom feel finished.", ["Paint", "Sconce install", "Trim repair"], ["bedroom", "paint", "lighting", "cozy"]],
  ["exterior-black-house", "Entryway", "High-contrast exterior", "Statement", "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80", "Dark siding, simple trim, and crisp landscaping create strong curb appeal.", ["Exterior paint", "Trim repair", "Landscape edging"], ["entry", "exterior", "paint", "landscaping"]],
  ["pool-yard-lounge", "Backyard", "Pool lounge corner", "Resort", "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=80", "Clean pool edging and comfortable seating turn the backyard into a resort-style zone.", ["Pool deck repair", "Drainage review", "Landscape lighting"], ["backyard", "pool", "deck", "lighting"]],
  ["modern-stair-hall", "Entryway", "Statement stair hall", "Architectural", "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=900&q=80", "Updated railing, wall finish, and lighting make a transition space feel designed.", ["Railing update", "Wall repair", "Lighting"], ["entry", "stairs", "railing", "lighting"]],
  ["warm-living-sectional", "Living Room", "Warm sectional layout", "Comfort", "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80", "A grounded seating layout, warm materials, and hidden storage make the room easier to live in.", ["Furniture layout", "Built-in storage", "Paint"], ["living", "storage", "paint", "layout"]],
  ["simple-dining-light", "Kitchen", "Dining light upgrade", "Polished", "https://images.unsplash.com/photo-1600210491369-e753d80a41f3?auto=format&fit=crop&w=900&q=80", "A strong fixture over the table can make a simple dining area feel intentional.", ["Fixture install", "Dimmer switch", "Ceiling patch"], ["kitchen", "dining", "lighting", "electrical"]],
  ["clean-bath-window", "Bathroom", "Bright bath corner", "Clean", "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=900&q=80", "Natural light, clean tile, and simple fixtures make the bath feel calm.", ["Tile touch-up", "Fixture replacement", "Paint"], ["bathroom", "tile", "fixture", "paint"]],
  ["calm-reading-room", "Living Room", "Quiet reading room", "Soft", "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80", "Shelves, a focused lamp, and soft wall color turn an extra space into a reading room.", ["Shelving", "Sconce wiring", "Paint"], ["living", "reading", "shelves", "lighting"]],
  ["closet-storage-wall", "Bedroom", "Storage wall closet", "Organized", "https://images.unsplash.com/photo-1617104678098-de229db51175?auto=format&fit=crop&w=900&q=80", "Built-in closet storage makes daily routines easier and keeps the room calmer.", ["Closet system", "Lighting", "Drawer install"], ["bedroom", "closet", "storage", "lighting"]],
  ["outdoor-table-patio", "Backyard", "Outdoor dining pad", "Outdoor", "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=900&q=80", "A dining pad, shade, and lights create an outdoor room for meals and guests.", ["Paver base", "Shade structure", "Exterior lighting"], ["backyard", "patio", "dining", "lighting"]],
  ["cabinet-hardware-detail", "Kitchen", "Cabinet hardware refresh", "Quick Win", "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80", "Hardware, paint, and backsplash details can update a kitchen without a full remodel.", ["Hardware swap", "Cabinet paint", "Backsplash repair"], ["kitchen", "hardware", "paint", "backsplash"]],
  ["spa-vanity-bath", "Bathroom", "Hotel vanity setup", "Elegant", "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=900&q=80", "A clean vanity, better mirror lighting, and storage make the bath more useful.", ["Vanity install", "Mirror lighting", "Plumbing connection"], ["bathroom", "vanity", "lighting", "plumbing"]],
  ["garden-walkway", "Backyard", "Garden walkway", "Garden", "https://images.unsplash.com/photo-1598902108854-10e335adac99?auto=format&fit=crop&w=900&q=80", "A defined path, planting beds, and edging make the yard feel ordered.", ["Path install", "Bed edging", "Irrigation"], ["backyard", "garden", "path", "landscaping"]],
  ["laundry-task-zone", "Laundry", "Task-focused laundry", "Utility", "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80", "Counter space, cabinets, and better light make laundry easier to manage.", ["Countertop", "Cabinet mounting", "Task lighting"], ["laundry", "cabinet", "counter", "lighting"]],
  ["pattern-floor-entry", "Entryway", "Graphic entry floor", "Statement", "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80", "Pattern tile creates a durable and memorable first step into the home.", ["Floor tile", "Baseboard repair", "Transition strip"], ["entry", "tile", "flooring", "foyer"]],
  ["dark-modern-kitchen", "Kitchen", "Dark modern kitchen", "Contrast", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80", "Deep cabinets and light surfaces create a sharp kitchen that still feels practical.", ["Cabinet painting", "Countertop update", "Lighting"], ["kitchen", "cabinet", "modern", "lighting"]],
  ["glass-shower-bath", "Bathroom", "Glass shower refresh", "Clean", "https://images.unsplash.com/photo-1604709177225-055f99402ea3?auto=format&fit=crop&w=900&q=80", "Glass, niches, and simple tile can make a shower feel larger.", ["Glass enclosure", "Tile niche", "Fixture install"], ["bathroom", "shower", "glass", "tile"]],
  ["living-accent-panel", "Living Room", "Textured accent wall", "Custom", "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=80", "Paneling adds structure behind a sofa, TV, or fireplace without a full renovation.", ["Trim carpentry", "Caulk", "Paint"], ["living", "paneling", "trim", "paint"]],
  ["small-bath-vanity", "Bathroom", "Small bath storage", "Small Space", "https://images.unsplash.com/photo-1595514535415-dae8970c520f?auto=format&fit=crop&w=900&q=80", "A compact vanity and brighter mirror make a small bathroom feel less crowded.", ["Vanity install", "Mirror wiring", "Plumbing"], ["bathroom", "small", "vanity", "mirror"]],
  ["open-shelf-kitchen", "Kitchen", "Open kitchen shelf", "Light", "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?auto=format&fit=crop&w=900&q=80", "Open shelving, tile, and lighting make everyday items part of the design.", ["Shelf mounting", "Backsplash tile", "Wall repair"], ["kitchen", "shelving", "tile", "backsplash"]],
];

const EXTRA_INSPIRATION_IDEAS = EXTRA_IMAGE_IDEAS.map(([id, area, title, style, image, description, projectNotes, tags], index) => ({
    area,
    id,
    title,
    style,
    image,
    description,
    projectNotes,
    tags,
    demo: true,
    sortWeight: index,
  }));

export default function CustomerInspiration() {
  const [search, setSearch] = useState("");
  const [activeArea, setActiveArea] = useState(AREAS[0]);
  const [activeBoard, setActiveBoard] = useState(BOARDS[0]);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [savedIdeaIDs, setSavedIdeaIDs] = useState([]);
  const [customIdeas, setCustomIdeas] = useState([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newIdea, setNewIdea] = useState({
    title: "",
    area: "Kitchen",
    image: "",
    description: "",
    tags: "",
  });
  const { width } = useWindowDimensions();
  const isPhone = width < 640;
  const columnCount = width >= 1040 ? 4 : width >= 720 ? 3 : 2;
  const allIdeas = useMemo(() => [...customIdeas, ...INSPIRATION_IDEAS, ...EXTRA_INSPIRATION_IDEAS], [customIdeas]);

  useEffect(() => {
    loadSavedIdeas();
    loadCustomIdeas();
  }, []);

  const loadSavedIdeas = async () => {
    try {
      const stored = await AsyncStorage.getItem(SAVED_IDEAS_KEY);
      setSavedIdeaIDs(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.log("Saved inspiration load error:", error);
    }
  };

  const loadCustomIdeas = async () => {
    try {
      const stored = await AsyncStorage.getItem(CUSTOM_IDEAS_KEY);
      setCustomIdeas(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.log("Custom inspiration load error:", error);
    }
  };

  const toggleSavedIdea = async (ideaID) => {
    const nextIDs = savedIdeaIDs.includes(ideaID)
      ? savedIdeaIDs.filter((id) => id !== ideaID)
      : [ideaID, ...savedIdeaIDs];

    setSavedIdeaIDs(nextIDs);
    try {
      await AsyncStorage.setItem(SAVED_IDEAS_KEY, JSON.stringify(nextIDs));
    } catch (error) {
      console.log("Saved inspiration update error:", error);
    }
  };

  const saveCustomIdea = async () => {
    const title = newIdea.title.trim();
    const image = newIdea.image.trim();
    const description = newIdea.description.trim();

    if (!title || !image) return;

    const tags = newIdea.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const idea = {
      id: `custom-${Date.now()}`,
      area: newIdea.area,
      title,
      style: "Saved idea",
      image,
      description: description || "Customer-added inspiration idea.",
      projectNotes: ["Review scope", "Match with a qualified contractor", "Turn into a planner item"],
      tags: tags.length ? tags : [newIdea.area.toLowerCase()],
      custom: true,
    };

    const nextIdeas = [idea, ...customIdeas];
    setCustomIdeas(nextIdeas);
    setSavedIdeaIDs((current) => (current.includes(idea.id) ? current : [idea.id, ...current]));
    setNewIdea({ title: "", area: "Kitchen", image: "", description: "", tags: "" });
    setAddModalVisible(false);

    try {
      await Promise.all([
        AsyncStorage.setItem(CUSTOM_IDEAS_KEY, JSON.stringify(nextIdeas)),
        AsyncStorage.setItem(SAVED_IDEAS_KEY, JSON.stringify([idea.id, ...savedIdeaIDs.filter((id) => id !== idea.id)])),
      ]);
    } catch (error) {
      console.log("Custom inspiration save error:", error);
    }
  };

  const filteredIdeas = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allIdeas.filter((idea) => {
      const haystack = [idea.area, idea.title, idea.style, idea.description, ...idea.tags].join(" ").toLowerCase();
      const matchesArea = activeArea.label === "All" || idea.area === activeArea.label;
      const matchesBoard =
        activeBoard.type === "all" ||
        (activeBoard.type === "saved" && savedIdeaIDs.includes(idea.id)) ||
        (activeBoard.type === "keyword" && activeBoard.keywords.some((keyword) => haystack.includes(keyword)));
      const matchesQuery = !query || haystack.includes(query);
      return matchesArea && matchesBoard && matchesQuery;
    });
  }, [activeArea, activeBoard, allIdeas, savedIdeaIDs, search]);

  const ideaColumns = useMemo(() => {
    return filteredIdeas.reduce(
      (columns, idea, index) => {
        columns[index % columnCount].push({ ...idea, displayIndex: index });
        return columns;
      },
      Array.from({ length: columnCount }, () => [])
    );
  }, [columnCount, filteredIdeas]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isPhone && styles.phoneHeader]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, isPhone && styles.phoneEyebrow]}>Fixie Ideas</Text>
            <Text style={[styles.titleText, isPhone && styles.phoneTitleText]}>
              {isPhone ? "Project ideas" : "Find your next project"}
            </Text>
          </View>
          <TouchableOpacity style={styles.addIdeaButton} onPress={() => setAddModalVisible(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color={fixieColors.background} />
            <Text style={styles.addIdeaText}>Add</Text>
          </TouchableOpacity>
        </View>
        {!isPhone ? (
          <Text style={styles.subtitle}>Save room ideas, explore project details, and turn inspiration into a contractor-ready plan.</Text>
        ) : null}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={fixieColors.textMuted} />
        <TextInput
          style={styles.searchBar}
          placeholder="Try kitchen, backyard, tile, lighting..."
          placeholderTextColor={fixieColors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch("")} style={styles.clearSearchButton}>
            <Ionicons name="close" size={16} color={fixieColors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardScroller}>
          {BOARDS.map((board) => {
            const active = activeBoard.label === board.label;
            return (
              <TouchableOpacity
                key={board.label}
                style={[styles.boardButton, active && styles.boardButtonActive]}
                onPress={() => setActiveBoard(board)}
                activeOpacity={0.78}
              >
                <Ionicons name={board.icon} size={17} color={active ? fixieColors.background : fixieColors.goldLight} />
                <Text style={[styles.boardLabel, active && styles.boardLabelActive]}>{board.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaScroller}>
          {AREAS.map((area) => {
            const active = activeArea.label === area.label;
            return (
              <TouchableOpacity
                key={area.label}
                style={[styles.areaButton, active && styles.areaButtonActive]}
                onPress={() => setActiveArea(area)}
                activeOpacity={0.75}
              >
                <Ionicons name={area.icon} size={18} color={active ? fixieColors.background : fixieColors.goldLight} />
                <Text style={[styles.areaLabel, active && styles.areaLabelActive]}>{area.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.resultsHeader}>
          <Text style={styles.sectionTitle}>{activeBoard.label === "All Ideas" ? "For You" : activeBoard.label}</Text>
          <Text style={styles.resultsMeta}>{filteredIdeas.length} pins</Text>
        </View>

        <View style={styles.masonryGrid}>
          {ideaColumns.map((column, columnIndex) => (
            <View key={`column-${columnIndex}`} style={styles.masonryColumn}>
              {column.map((idea) => {
                const saved = savedIdeaIDs.includes(idea.id);
                return (
                  <TouchableOpacity
                    key={idea.id}
                    style={[styles.ideaCard, { height: getTileHeight(idea.displayIndex, columnCount) }]}
                    onPress={() => setSelectedIdea(idea)}
                    activeOpacity={0.86}
                  >
                    <Image source={{ uri: idea.image }} style={styles.ideaImage} />
                    <TouchableOpacity
                      style={[styles.cardSaveButton, saved && styles.cardSaveButtonActive]}
                      onPress={(event) => {
                        event.stopPropagation();
                        toggleSavedIdea(idea.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={saved ? "heart" : "heart-outline"} size={17} color={saved ? fixieColors.background : fixieColors.text} />
                    </TouchableOpacity>
                    <View style={styles.imageOverlay}>
                      <Text style={styles.areaTag}>{idea.area}</Text>
                      <Text style={styles.ideaTitle} numberOfLines={2}>{idea.title}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {filteredIdeas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={32} color={fixieColors.goldLight} />
            <Text style={styles.emptyTitle}>No ideas found</Text>
            <Text style={styles.emptyText}>Try another room, feature, or style to keep exploring.</Text>
          </View>
        ) : null}
      </ScrollView>

      <CustomerBottomNav />

      <Modal visible={!!selectedIdea} transparent animationType="slide" onRequestClose={() => setSelectedIdea(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedIdea ? (
              <>
                <Image source={{ uri: selectedIdea.image }} style={styles.modalImage} />
                <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedIdea(null)}>
                  <Ionicons name="close" size={20} color={fixieColors.text} />
                </TouchableOpacity>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.modalTitleRow}>
                    <View style={styles.modalTitleCopy}>
                      <Text style={styles.modalArea}>{selectedIdea.area}</Text>
                      <Text style={styles.modalTitle}>{selectedIdea.title}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.modalSaveButton, savedIdeaIDs.includes(selectedIdea.id) && styles.modalSaveButtonActive]}
                      onPress={() => toggleSavedIdea(selectedIdea.id)}
                    >
                      <Ionicons
                        name={savedIdeaIDs.includes(selectedIdea.id) ? "heart" : "heart-outline"}
                        size={18}
                        color={savedIdeaIDs.includes(selectedIdea.id) ? fixieColors.background : fixieColors.goldLight}
                      />
                      <Text style={[styles.modalSaveText, savedIdeaIDs.includes(selectedIdea.id) && styles.modalSaveTextActive]}>
                        {savedIdeaIDs.includes(selectedIdea.id) ? "Saved" : "Save"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.modalDescription}>{selectedIdea.description}</Text>

                  <Text style={styles.modalSectionTitle}>Project notes</Text>
                  {selectedIdea.projectNotes.map((note) => (
                    <View key={note} style={styles.noteRow}>
                      <Ionicons name="checkmark-circle" size={17} color={fixieColors.goldLight} />
                      <Text style={styles.noteText}>{note}</Text>
                    </View>
                  ))}

                  <View style={styles.tagRow}>
                    {selectedIdea.tags.map((tag) => (
                      <View key={tag} style={styles.keywordTag}>
                        <Text style={styles.keywordText}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.planButton} onPress={() => router.push("/customer/planner")}>
                    <Ionicons name="create-outline" size={18} color={fixieColors.background} />
                    <Text style={styles.planButtonText}>Open Planner</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.addModalCard}>
            <View style={styles.addModalHeader}>
              <View>
                <Text style={styles.modalArea}>Add Inspiration</Text>
                <Text style={styles.addModalTitle}>Create a new idea</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseInline} onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={20} color={fixieColors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.formInput}
              placeholder="Idea title"
              placeholderTextColor={fixieColors.textMuted}
              value={newIdea.title}
              onChangeText={(title) => setNewIdea((current) => ({ ...current, title }))}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Image URL"
              placeholderTextColor={fixieColors.textMuted}
              value={newIdea.image}
              onChangeText={(image) => setNewIdea((current) => ({ ...current, image }))}
              autoCapitalize="none"
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formAreaScroller}>
              {AREAS.filter((area) => area.label !== "All").map((area) => {
                const active = newIdea.area === area.label;
                return (
                  <TouchableOpacity
                    key={area.label}
                    style={[styles.formAreaButton, active && styles.formAreaButtonActive]}
                    onPress={() => setNewIdea((current) => ({ ...current, area: area.label }))}
                  >
                    <Text style={[styles.formAreaText, active && styles.formAreaTextActive]}>{area.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              placeholder="Description or notes"
              placeholderTextColor={fixieColors.textMuted}
              value={newIdea.description}
              onChangeText={(description) => setNewIdea((current) => ({ ...current, description }))}
              multiline
            />
            <TextInput
              style={styles.formInput}
              placeholder="Tags, separated by commas"
              placeholderTextColor={fixieColors.textMuted}
              value={newIdea.tags}
              onChangeText={(tags) => setNewIdea((current) => ({ ...current, tags }))}
            />

            <TouchableOpacity
              style={[styles.planButton, (!newIdea.title.trim() || !newIdea.image.trim()) && styles.disabledButton]}
              onPress={saveCustomIdea}
              disabled={!newIdea.title.trim() || !newIdea.image.trim()}
            >
              <Ionicons name="images-outline" size={18} color={fixieColors.background} />
              <Text style={styles.planButtonText}>Save Idea</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getTileHeight(index, columnCount) {
  const heights = columnCount >= 3 ? [190, 250, 220, 280, 205, 240] : [190, 240, 210, 265, 220];
  return heights[index % heights.length];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: fixieColors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  phoneHeader: {
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  addIdeaButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: fixieColors.gold,
    ...fixieShadows.glow,
  },
  addIdeaText: {
    color: fixieColors.background,
    fontSize: 13,
    fontWeight: "900",
  },
  eyebrow: {
    color: fixieColors.goldLight,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  phoneEyebrow: {
    fontSize: 10,
  },
  titleText: {
    marginTop: 5,
    fontSize: 28,
    fontWeight: "800",
    color: fixieColors.text,
  },
  phoneTitleText: {
    marginTop: 2,
    fontSize: 20,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: fixieColors.textSecondary,
  },
  searchWrap: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: fixieColors.surface,
    borderWidth: 1,
    borderColor: fixieColors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBar: {
    flex: 1,
    color: fixieColors.text,
    paddingVertical: 14,
  },
  clearSearchButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fixieColors.surfaceElevated,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 120,
  },
  boardScroller: {
    gap: 10,
    paddingRight: 20,
    marginBottom: 12,
  },
  boardButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: fixieColors.surfaceElevated,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  boardButtonActive: {
    backgroundColor: fixieColors.gold,
    borderColor: fixieColors.goldLight,
    ...fixieShadows.glow,
  },
  boardLabel: {
    color: fixieColors.textSecondary,
    fontSize: 13,
    fontWeight: "900",
  },
  boardLabelActive: {
    color: fixieColors.background,
  },
  areaScroller: {
    gap: 10,
    paddingRight: 20,
    marginBottom: 18,
  },
  areaButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 16,
    paddingHorizontal: 13,
    backgroundColor: fixieColors.surface,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  areaButtonActive: {
    backgroundColor: fixieColors.gold,
    borderColor: fixieColors.goldLight,
    ...fixieShadows.glow,
  },
  areaLabel: {
    color: fixieColors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  areaLabelActive: {
    color: fixieColors.background,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: fixieColors.text,
  },
  resultsMeta: {
    color: fixieColors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  masonryGrid: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  masonryColumn: {
    flex: 1,
    gap: 12,
  },
  ideaCard: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: fixieColors.surfaceElevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: fixieColors.border,
    ...fixieShadows.card,
  },
  ideaImage: {
    width: "100%",
    height: "100%",
    backgroundColor: fixieColors.surfaceElevated,
  },
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    backgroundColor: "rgba(12, 12, 13, 0.58)",
  },
  cardSaveButton: {
    position: "absolute",
    top: 9,
    right: 9,
    zIndex: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
  cardSaveButtonActive: {
    backgroundColor: fixieColors.gold,
    borderColor: fixieColors.goldLight,
  },
  areaTag: {
    color: fixieColors.goldLight,
    fontSize: 11,
    fontWeight: "800",
  },
  ideaTitle: {
    marginTop: 4,
    color: fixieColors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
  },
  emptyState: {
    width: "100%",
    minHeight: 230,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: fixieColors.border,
    backgroundColor: fixieColors.surface,
    padding: 24,
  },
  emptyTitle: {
    marginTop: 10,
    color: fixieColors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 8,
    color: fixieColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: fixieColors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 620,
    maxHeight: "88%",
    overflow: "hidden",
    backgroundColor: fixieColors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: fixieColors.border,
    ...fixieShadows.card,
  },
  addModalCard: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "88%",
    backgroundColor: fixieColors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: fixieColors.border,
    padding: 18,
    ...fixieShadows.card,
  },
  addModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  addModalTitle: {
    marginTop: 5,
    color: fixieColors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  modalCloseInline: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fixieColors.surfaceElevated,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  formInput: {
    width: "100%",
    backgroundColor: fixieColors.backgroundAlt,
    borderWidth: 1,
    borderColor: fixieColors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: fixieColors.text,
    fontSize: 15,
    marginBottom: 12,
  },
  formTextArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  formAreaScroller: {
    gap: 8,
    paddingRight: 12,
    marginBottom: 12,
  },
  formAreaButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: fixieColors.backgroundAlt,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  formAreaButtonActive: {
    backgroundColor: fixieColors.gold,
    borderColor: fixieColors.goldLight,
  },
  formAreaText: {
    color: fixieColors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  formAreaTextActive: {
    color: fixieColors.background,
  },
  disabledButton: {
    opacity: 0.48,
  },
  modalImage: {
    width: "100%",
    height: 250,
    backgroundColor: fixieColors.surfaceElevated,
  },
  modalClose: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(28, 28, 30, 0.86)",
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginHorizontal: 18,
    marginTop: 18,
  },
  modalTitleCopy: {
    flex: 1,
    minWidth: 0,
  },
  modalArea: {
    color: fixieColors.goldLight,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  modalTitle: {
    marginTop: 6,
    color: fixieColors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  modalSaveButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    backgroundColor: fixieColors.backgroundAlt,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  modalSaveButtonActive: {
    backgroundColor: fixieColors.gold,
    borderColor: fixieColors.goldLight,
  },
  modalSaveText: {
    color: fixieColors.goldLight,
    fontSize: 13,
    fontWeight: "900",
  },
  modalSaveTextActive: {
    color: fixieColors.background,
  },
  modalDescription: {
    marginTop: 10,
    marginHorizontal: 18,
    color: fixieColors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  modalSectionTitle: {
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 18,
    color: fixieColors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 18,
    marginBottom: 8,
  },
  noteText: {
    flex: 1,
    color: fixieColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: 18,
    marginTop: 10,
  },
  keywordTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: fixieColors.backgroundAlt,
    borderWidth: 1,
    borderColor: fixieColors.border,
  },
  keywordText: {
    color: fixieColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  planButton: {
    margin: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: fixieColors.gold,
    borderRadius: 16,
    paddingVertical: 14,
    ...fixieShadows.glow,
  },
  planButtonText: {
    color: fixieColors.background,
    fontSize: 16,
    fontWeight: "800",
  },
});
