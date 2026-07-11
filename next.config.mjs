const nextConfig = {
  async rewrites() {
    return [
      { source: "/gebärdensprache", destination: "/sign-translate" },
      { source: "/gebaerdensprache", destination: "/sign-translate" }
    ];
  }
};
export default nextConfig;
