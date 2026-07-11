export const leagues = [
  {
    id: "bronze",
    name: "Bronze Liga",
    minPoints: 0,
    icon: "🥉",
    image: "/leagues/bronze.png",
  },
  {
    id: "silver",
    name: "Silber Liga",
    minPoints: 50,
    icon: "🥈",
    image: "/leagues/silver.png",
  },
  {
    id: "gold",
    name: "Gold Liga",
    minPoints: 150,
    icon: "🥇",
    image: "/leagues/gold.png",
  },
  {
    id: "platinum",
    name: "Platin Liga",
    minPoints: 300,
    icon: "🏆",
    image: "/leagues/platinum.png",
  },
  {
    id: "diamond",
    name: "Diamant Liga",
    minPoints: 500,
    icon: "💎",
    image: "/leagues/diamond.png",
  },
  {
    id: "cosmic",
    name: "Kosmische Liga",
    minPoints: 750,
    icon: "🌌",
    image: "/leagues/cosmic.png",
  },
];

export function getLeague(points = 0) {
  return leagues.reduce((currentLeague, league) => {
    return points >= league.minPoints ? league : currentLeague;
  }, leagues[0]);
}

export function getNextLeague(points = 0) {
  return leagues.find((league) => league.minPoints > points) || null;
}
