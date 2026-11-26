# Captures de Vigie pour le site

Ce dossier est vide pour l'instant : le visuel principal du site est une maquette en HTML et
CSS (bloc `<figure class="window js-tilt">` de `index.html`), avec des noms et des tailles
fictifs.

## Règles

Vigie affiche les fichiers du Mac : une capture faite sur un vrai Mac montre presque toujours
des informations personnelles.

- Aucun chemin complet, aucun nom d'utilisateur, aucun nom de client, de projet, de dépôt ou
  de conteneur Docker réel. Faire les captures sur un compte macOS de démonstration, avec des
  dossiers et des projets fictifs.
- Aucune notification, aucun onglet ni aucune app d'arrière-plan qui trahirait un nom réel.
- Fenêtre seule, sans le bureau autour (Cmd-Maj-4, puis Espace, puis Option-clic sur la
  fenêtre pour retirer l'ombre).
- Relire chaque capture en grand avant de l'ajouter : une fois poussée, elle reste dans
  l'historique du dépôt public.

## Noms et formats attendus

Pour chaque capture, trois fichiers de même nom : `.avif` (le plus léger), `.webp`, et `.png`
en repli. Largeur 2560 px (écran Retina, la fenêtre s'affiche à 1180 px au plus).

| Nom | Contenu | Remplace |
|---|---|---|
| `vue-ensemble` | Vue d'ensemble : disque, activité, ce qui peut être libéré | la maquette du visuel principal |
| `liberer` | Libérer de l'espace, avec des éléments vert, orange et rouge | le visuel de la carte "Libérer de l'espace" |
| `barre-menus` | Le menu de la barre des menus ouvert | le visuel de la carte "Dans la barre des menus" |
| `widgets` | Les widgets sur le bureau | le visuel de la carte "Widgets" |

Conversion (outils Homebrew) :

```sh
cwebp -q 82 vue-ensemble.png -o vue-ensemble.webp
avifenc -q 60 vue-ensemble.png vue-ensemble.avif
```

## Remplacer la maquette par une capture

Dans `index.html`, remplacer le contenu de `<figure class="window js-tilt">` (la barre
`win-bar` et le bloc `app`) par :

```html
<picture>
  <source srcset="assets/captures/vue-ensemble.avif" type="image/avif">
  <source srcset="assets/captures/vue-ensemble.webp" type="image/webp">
  <img src="assets/captures/vue-ensemble.png" width="2560" height="1600"
       alt="La fenêtre de Vigie, section Vue d'ensemble.">
</picture>
```

La première capture est visible au chargement : pas de `loading="lazy"` sur elle. Les
suivantes, plus bas dans la page, prennent `loading="lazy" decoding="async"`. Supprimer
ensuite la ligne "Interface simulée. Noms et tailles fictifs." (`showcase-note`), puis changer
le numéro `?v=` des liens CSS et JS.
