import { createRouter, createWebHashHistory } from 'vue-router';

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
    { path: '/:pathMatch(.*)*', name: 'notfound', component: () => import('./views/NotFoundView.vue'), meta: { title: 'Not found' } },
  ],
});
router.afterEach(to => { document.title = (to.meta.title ? String(to.meta.title) + ' · ' : '') + 'CINEVERSE'; });
