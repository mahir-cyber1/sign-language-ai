export const profileAvatars = [
  { id: "star", icon: "⭐", label: "Stern", background: "#4a148c", unlockPoints: 0 },
  { id: "book", icon: "📘", label: "Buch", background: "#00695c", unlockPoints: 10 },
  { id: "pencil", icon: "✏️", label: "Stift", background: "#ef6c00", unlockPoints: 25 },
  { id: "rocket", icon: "🚀", label: "Rakete", background: "#0d47a1", unlockPoints: 50 },
  { id: "bulb", icon: "💡", label: "Idee", background: "#f9a825", unlockPoints: 75 },
  { id: "calculator", icon: "🧮", label: "Rechnen", background: "#2e7d32", unlockPoints: 100 },
  { id: "medal", icon: "🏅", label: "Medaille", background: "#795548", unlockPoints: 150 },
  { id: "globe", icon: "🌍", label: "Welt", background: "#0277bd", unlockPoints: 200 },
  { id: "rainbow", icon: "🌈", label: "Regenbogen", background: "#ad1457", unlockPoints: 300 },
  { id: "planet", icon: "🪐", label: "Planet", background: "#283593", unlockPoints: 500 },
  { id: "music", icon: "🎵", label: "Musik", background: "#6a1b9a", unlockPoints: 650 },
  { id: "spark", icon: "✨", label: "Glanz", background: "#455a64", unlockPoints: 750 },
];

export const profileFrames = [
  { id: "none", label: "Ohne Rahmen", color: "transparent", unlockPoints: 0 },
  { id: "bronze", label: "Bronze", color: "#cd7f32", unlockPoints: 25 },
  { id: "silver", label: "Silber", color: "#c7d0da", unlockPoints: 75 },
  { id: "gold", label: "Gold", color: "#ffc107", unlockPoints: 150 },
  { id: "cosmic", label: "Kosmisch", color: "#a855f7", unlockPoints: 750 },
];

export const profileThemes = [
  { id: "blue", label: "Blau", color: "#1976d2", unlockPoints: 0 },
  { id: "green", label: "Grün", color: "#2e7d32", unlockPoints: 50 },
  { id: "orange", label: "Orange", color: "#ef6c00", unlockPoints: 100 },
  { id: "pink", label: "Pink", color: "#c2185b", unlockPoints: 300 },
  { id: "cosmic", label: "Kosmisch", color: "#7c3aed", unlockPoints: 750 },
];

export function getProfileAvatar(avatarId) {
  return (
    profileAvatars.find((avatar) => avatar.id === avatarId) ||
    profileAvatars[0]
  );
}

export function getProfileFrame(frameId) {
  return profileFrames.find((frame) => frame.id === frameId) || profileFrames[0];
}

export function getProfileTheme(themeId) {
  return profileThemes.find((theme) => theme.id === themeId) || profileThemes[0];
}
