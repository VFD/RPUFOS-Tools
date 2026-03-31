# 📜 Commandes HP‑GL / DXY‑GL

NOT FOR X07 X710.

## 🔧 Initialisation et configuration
| Commande | Description | Exemple |
|----------|-------------|---------|
| `IN;`    | Initialisation / reset | `IN;` |
| `DF;`    | Rétablir les paramètres par défaut | `DF;` |
| `SPn;`   | Sélection du stylo *n* (1–4) | `SP1;` |
| `SP0;`   | Désélectionner le stylo (aucun tracé) | `SP0;` |

---

## ✏️ Mouvement du stylo
| Commande | Description | Exemple |
|----------|-------------|---------|
| `PU;`    | Lever le stylo (sans coordonnées) | `PU;` |
| `PU x,y;` | Lever le stylo et déplacer | `PU100,200;` |
| `PD;`    | Abaisser le stylo (sans coordonnées) | `PD;` |
| `PD x,y;` | Abaisser le stylo et tracer | `PD300,400;` |
| `PA x,y;` | Plot Absolute → coordonnées absolues | `PA500,600;` |
| `PR dx,dy;` | Plot Relative → déplacement relatif | `PR50,50;` |

---

## 📐 Formes géométriques
| Commande | Description | Exemple |
|----------|-------------|---------|
| `CI r;`  | Cercle de rayon *r* | `CI100;` |
| `AA x,y,a;` | Arc absolu (centre x,y, angle a) | `AA200,200,90;` |
| `AR dx,dy,a;` | Arc relatif | `AR50,50,45;` |
| `EA x,y;` | Rectangle absolu (coin opposé) | `EA300,400;` |
| `ER dx,dy;` | Rectangle relatif | `ER100,200;` |
| `RA x,y;` | Rectangle rempli absolu | `RA300,400;` |
| `RR dx,dy;` | Rectangle rempli relatif | `RR100,200;` |
| `WG r,a;` | Secteur (Wedge) | `WG50,180;` |

---

## 🖊️ Style et vitesse
| Commande | Description | Exemple |
|----------|-------------|---------|
| `LTn;`   | Type de ligne (Line Type) | `LT1;` |
| `PWn;`   | Largeur du trait (Pen Width) | `PW2;` |
| `VSn;`   | Vitesse du tracé (Velocity Select) | `VS5;` |

---

## 🔤 Texte
| Commande | Description | Exemple |
|----------|-------------|---------|
| `LBtexte;` | Label → écrire du texte | `LBHELLO;` |
| `CA n;`   | Sélection du jeu de caractères | `CA1;` |
| `SI w,h;` | Taille des caractères (Scale) | `SI2,3;` |
| `DI x,y;` | Direction du texte | `DI1,0;` |

---

## 📄 Gestion de page et coordonnées
| Commande | Description | Exemple |
|----------|-------------|---------|
| `IP x1,y1,x2,y2;` | Définir la fenêtre de tracé (Input Window) | `IP0,0,1000,1000;` |
| `SC x1,y1,x2,y2;` | Définir l’échelle (Scale) | `SC0,0,10,10;` |
| `RO a;` | Rotation du système de coordonnées | `RO90;` |
| `PG;` | Fin de page / avance papier | `PG;` |

---

## ⚙️ Paramètres série usuels
- **Baudrate** : 4800 ou 9600 bauds  
- **Data bits** : 8  
- **Parité** : None  
- **Stop bits** : 1  
- **Handshake** : None ou XOn/XOff  

---

## 🔄 Exemple complet
Tracer un carré avec le stylo 1 :


'''
IN;
SP1;
PU100,100;
PD200,100;
PD200,200;
PD100,200;
PD100,100;
PU;
'''
