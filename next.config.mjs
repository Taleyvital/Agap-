/** @type {import('next').NextConfig} */
const isMobileBuild = process.env.MOBILE_BUILD === "true";

const nextConfig = {
  ...(isMobileBuild && {
    output: "export",
    trailingSlash: true,
  }),
  images: {
    unoptimized: isMobileBuild,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "vibvveaoicgksvwwjvxs.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
