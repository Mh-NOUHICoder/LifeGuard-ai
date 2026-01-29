import withPWA from 'next-pwa';

const pwa = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
};

export default pwa(nextConfig);
