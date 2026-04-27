# UNO Web – Projet étudiant

Application web multijoueur permettant de jouer au UNO en ligne, avec gestion des comptes, salons, salle d’attente et interface de jeu dynamique. Ce projet a été réalisé par **Thomas**, **Clément**, **Hugo** et **Damien**.

---

## Présentation du projet

Le projet consiste à développer une application web permettant à plusieurs joueurs de se connecter, créer ou rejoindre un salon, patienter dans une salle d’attente, puis lancer une partie de UNO conforme aux règles classiques. L’interface est pensée pour être simple, intuitive et accessible.

L’architecture repose sur une base HTML, CSS et JavaScript côté client. Le backend utilise Bun pour l’exécution JavaScript et la gestion du serveur.

---

## Fonctionnalités principales

### Authentification
- Création de compte avec pseudo et mot de passe.
- Connexion sécurisée.
- Affichage du nom de l’utilisateur connecté.
- Déconnexion.

### Lobby
- Création de salons avec nom personnalisé.
- Liste des salons disponibles.
- Recherche par nom.
- Filtre par nombre de joueurs.
- Indication du nombre total de salons.
- Rejoindre un salon existant.
- Retour automatique vers son salon si l’utilisateur en possède déjà un.

### Salle d’attente
- Affichage du nom du salon.
- Liste des joueurs présents.
- Indication du nombre de joueurs (maximum 4).
- Bouton de lancement de partie réservé à l’hôte.
- Message d’attente pour les autres joueurs.
- Possibilité de quitter le salon.

### Partie (selon implémentation backend)
- Distribution automatique des cartes.
- Gestion des tours.
- Application des règles du UNO.
- Gestion du UNO et du Contre-UNO.
- Détection de la fin de partie.

---

## Règles du jeu

- Chaque joueur commence avec 7 cartes.
- Une carte peut être jouée si elle correspond en couleur ou en chiffre.
- Cartes spéciales :
  - Passer : le joueur suivant passe son tour.
  - Inverser : inverse le sens du jeu.
  - +2 : le joueur suivant pioche deux cartes.
  - Joker : choix libre de la couleur.
  - Joker +4 : choix de la couleur et pioche de quatre cartes pour le joueur suivant.
- Obligation de dire « UNO » lorsqu’il reste une carte.
- Contre-UNO : si un joueur oublie de dire UNO, un adversaire peut le pénaliser de deux cartes.
- Le premier joueur sans carte remporte la partie.

---

## Technologies utilisées

- HTML5 pour la structure des pages.
- CSS3 pour la mise en forme et le responsive design.
- JavaScript pour les interactions et la gestion dynamique des salons.
- Bun pour l’exécution du serveur et la gestion du backend.

---

## Installation et lancement

### 1. Cloner le dépôt
```bash
https://github.com/clement444/Projet-Uno-Web
cd Projet-Uno-Web
```

### 2. Installer les dépendances
```bash
bun install
```

### 3. Lancer le serveur en mode dev
```bash
bun dev
```

### 4. Accéder à l’application
```
http://localhost:3000
```
