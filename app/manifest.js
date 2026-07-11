export default function manifest() {
  return {
    name: "Gebärdensprache KI",
    short_name: "Gebärden KI",
    start_url: "/",
    display: "standalone",
    background_color: "#08121f",
    theme_color: "#2563eb",
    icons: [{ src: "/sign-icon.svg", sizes: "any", type: "image/svg+xml" }]
  };
}
