import { createRouter, createWebHashHistory } from 'vue-router';
import { useCatalog } from './stores/catalog';

// Hash history: the site is plain static files on Shadw and Vercel, so there is no server rewrite for deep links.
export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: (_to, _from, saved) => saved || { top: 0 },
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue'), meta: { title: 'Every movie connects' } },
    { path: '/explore', name: 'explore', component: () => import('./views/ExploreView.vue'), meta: { title: 'Movie map' } },
    { path: '/movie/:id', name: 'movie', component: () => import('./views/MovieView.vue'), props: true },
    { path: '/person/:id', name: 'person', component: () => import('./views/PersonView.vue'), props: true },
    { path: '/people', name: 'people', component: () => import('./views/PeopleView.vue'), meta: { title: 'Directors and actors' } },
    { path: '/franchises', name: 'franchises', component: () => import('./views/FranchisesView.vue'), meta: { title: 'Franchises' } },
    { path: '/franchise/:id', name: 'franchise', component: () => import('./views/FranchiseView.vue'), props: true },
    { path: '/trilogies', name: 'trilogies', component: () => import('./views/TrilogiesView.vue'), meta: { title: 'The Trilogy Machine' } },
    { path: '/genre/:id', name: 'genre', component: () => import('./views/GenreView.vue'), props: true },
    { path: '/timeline', name: 'timeline', component: () => import('./views/TimelineView.vue'), meta: { title: 'Cinematic timeline' } },
    { path: '/paths', name: 'paths', component: () => import('./views/PathsView.vue'), meta: { title: 'Six degrees of cinema' } },
    { path: '/collections', name: 'collections', component: () => import('./views/CollectionsView.vue'), meta: { title: 'Collections' } },
    { path: '/search', name: 'search', component: () => import('./views/SearchView.vue'), meta: { title: 'Search' } },
    { path: '/about', name: 'about', component: () => import('./views/AboutView.vue'), meta: { title: 'About the data' } },
    { path: '/:pathMatch(.*)*', name: 'notfound', component: () => import('./views/NotFoundView.vue'), meta: { title: 'Not found' } },
  ],
});
router.afterEach(to => {
  let t = to.meta.title ? String(to.meta.title) : '';
  const cat = useCatalog().cat; const id = String(to.params.id || '');
  if (cat && id) { if (to.name === 'movie') t = cat.film.get(id)?.t || 'Not found'; else if (to.name === 'person') t = cat.person.get(id)?.n || 'Not found'; else if (to.name === 'genre') t = (cat.genreName.get(id) || 'Genre') + ' films'; else if (to.name === 'franchise') t = cat.franchise.get(id)?.n || 'Not found'; }
  document.title = (t ? t + ' · ' : '') + 'CINEVERSE';
});
