# Vigie

Vigie est une app native pour Mac qui surveille l'espace disque et ce qui tourne sur la machine
(apps, serveurs locaux, Docker). Elle prévient avant que le disque soit plein, et propose quoi
libérer avec trois niveaux : vert (se recrée tout seul, un clic), orange (à vérifier, élément
par élément, vers la corbeille) et rouge (signalé seulement, jamais supprimé). Rien n'est dit
"sans risque" sans preuve : app fermée, aucun fichier ouvert, rien de modifié depuis au moins
une heure. Sans compte, sans serveur, sans publicité, sans pisteur.

**Site : https://feltrincyril.github.io/Vigie-releases/**

Ce dépôt sert à distribuer l'application : les images disque (Releases), le flux des mises à
jour automatiques et le site. Il ne contient aucune ligne du code de l'app.

## Télécharger

[Dernière version](https://github.com/FELTRINCyril/Vigie-releases/releases/latest), fichier
`Vigie-<version>.dmg`.

Vigie exige macOS 26 ou plus récent, sur un Mac Apple Silicon ou Intel.

## Installer

1. Ouvrez l'image disque téléchargée.
2. Faites glisser Vigie sur le dossier Applications, puis éjectez l'image disque.
3. À la première ouverture, macOS rappelle que Vigie vient d'Internet : cliquez sur "Ouvrir".
   Vigie s'installe dans la barre des menus, en haut de l'écran.

Vigie est signé par son développeur et validé par Apple (notarisé) : aucun réglage de sécurité
à modifier.

### Recommandé : l'accès complet au disque

Sans lui, macOS cache à Vigie certains dossiers protégés (sauvegardes d'iPhone, données de
certaines apps), qui ne sont alors pas mesurés. Pour l'accorder : Réglages Système >
Confidentialité et sécurité > Accès complet au disque, activez Vigie, puis relancez l'analyse.

## Mises à jour

À partir de la 0.3.0, Vigie vérifie au lancement, puis une fois par jour, s'il existe une
nouvelle version, et vous la propose avec ses nouveautés. Chaque mise à jour est signée et
vérifiée avant son installation. Les réglages de Vigie permettent aussi de lancer une recherche
ou de couper la vérification automatique.

Vous avez la 0.2.0 ou une version plus ancienne : elle ne sait pas se mettre à jour seule.
Installez une fois la dernière version à sa place ; vos réglages sont gardés.

## Retours

Les retours passent par les issues de ce dépôt :

- [Signaler un problème](https://github.com/FELTRINCyril/Vigie-releases/issues/new?template=probleme.yml)
- [Proposer une idée ou une amélioration](https://github.com/FELTRINCyril/Vigie-releases/issues/new?template=idee.yml)
- [Poser une question](https://github.com/FELTRINCyril/Vigie-releases/issues/new?template=question.yml)

**Les issues sont publiques.** Vigie affiche les fichiers de votre Mac : n'y mettez jamais de
chemin complet (il contient votre nom d'utilisateur), de nom de client ou de projet, même dans
une capture d'écran.

## Contenu du dépôt

| Fichier | Rôle |
|---|---|
| `appcast.xml` | Flux des mises à jour automatiques, lu par Vigie. Écrit par le script de publication. |
| `Vigie-<version>.html` | Notes de chaque version, affichées dans la fenêtre de mise à jour. |
| `index.html`, `versions.html`, `assets/` | Le site (GitHub Pages, branche `main`, racine) et sa page des versions. |
| `.github/ISSUE_TEMPLATE/` | Formulaires des issues. |

Les liens vers `assets/css/site.css` et `assets/js/*.js` portent un numéro `?v=AAAAMMJJ` : à
changer dans `index.html` et `versions.html` à chaque modification de ces fichiers, sinon un
visiteur peut garder l'ancienne version en cache.
