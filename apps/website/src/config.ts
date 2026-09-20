// URL of the teacher-facing app. Set VITE_APP_URL at build time so the
// marketing site can point at a preview deployment instead of production.
//
// `||` rather than `??`: CI passes the variable through whether or not it is
// set, so an unset one arrives as "" — which is not nullish, and would leave
// every link to the app pointing at the marketing site's own origin.
export const APP_URL = import.meta.env.VITE_APP_URL || "https://app.depedtoolkit.com";
