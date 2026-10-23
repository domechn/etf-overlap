import { useEffect } from 'react';

export interface PageMeta {
  lang: string;
  title: string;
  description: string;
  keywords: string;
  url: string;
  siteName: string;
  image: string;
}

const upsert = (selector: string, make: () => HTMLElement, set: (el: HTMLElement) => void) => {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = make();
    document.head.appendChild(el);
  }
  set(el);
};

const meta = (attr: 'name' | 'property', key: string, content: string) =>
  upsert(
    `meta[${attr}="${key}"]`,
    () => {
      const m = document.createElement('meta');
      m.setAttribute(attr, key);
      return m;
    },
    (el) => el.setAttribute('content', content),
  );

/**
 * Updates the tags that index.html already ships (so crawlers that do not run JS still see them)
 * instead of appending duplicates.
 */
export function useDocumentMeta(m: PageMeta) {
  useEffect(() => {
    document.documentElement.lang = m.lang;
    document.title = m.title;
    meta('name', 'description', m.description);
    meta('name', 'keywords', m.keywords);
    meta('property', 'og:type', 'website');
    meta('property', 'og:site_name', m.siteName);
    meta('property', 'og:title', m.title);
    meta('property', 'og:description', m.description);
    meta('property', 'og:url', m.url);
    meta('property', 'og:image', m.image);
    meta('name', 'twitter:card', 'summary_large_image');
    meta('name', 'twitter:title', m.title);
    meta('name', 'twitter:description', m.description);
    meta('name', 'twitter:image', m.image);
    upsert(
      'link[rel="canonical"]',
      () => {
        const l = document.createElement('link');
        l.setAttribute('rel', 'canonical');
        return l;
      },
      (el) => el.setAttribute('href', m.url),
    );
  }, [m.lang, m.title, m.description, m.keywords, m.url, m.siteName, m.image]);
}
