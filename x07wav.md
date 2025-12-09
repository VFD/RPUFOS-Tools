




Le Format de Sauvegarde du Canon X-07

    Période de 1/1200 secondes par bit
    Un bit 0 : 1200 Hz
    Un bit 1 : 2400 Hz
    Signal "carré" de période 1/1200 sec

Chaque octet est transmis dans une trame de 12 bits (et non pas de 11 comme le dit la doc !) de la façon suivante :


|0 	|1 	|1 	|0 	|0 	|1 	|0 	|1 	|1 	|1 	|1 	|1|
|----|----|----|----|----|----|----|----|----|----|----|----|
|bit de Start| 	octet inversé 	|bits de Fin |  |  |

        - 1 bit 0
        - 8 bits de l'octet en commençant par le bit de poids faible.
        - 3 bits de fin à 1

Cela fait une vitesse de transmission de 100 octets/sec. On peut remarquer que cette trame élémentaire ne comporte pas de bit de checksum.


La structure du programme est décrite p121 du "Guide de l'utilisateur", ce qui est rare et mérite d'être souligné.
1 	2 	3 	4 	5 	6 	7
2400 Hz
4 sec 	10 x &HD3 	nom ASCII du fichier
6 caractères maxi 	2400 Hz
0.25 sec 	octets du programme 	13 x &H00 	2400 Hz
0.5 sec

- Un signal de 2400 Hz de 4 secondes
- 10 octets &HD3
- Le nom du programme en ASCII ( 6 caractères maximum)
- Un signal de 2400Hz de 0.25 secondes
- Les octets du programme
- 13 octets &H00
- Un signal de 2400Hz de 0.5 secondes

Les octets représentent le programme tel qu'il est représenté dans la mémoire avec les instructions BASIC traduites en code interne.

Le signal du Canon commence par la partie basse puis par la partie haute.

Il est possible avec le magnétocassette officiel Canon X-730 de changer la phase du signal via un inverseur sur le coté de l'appareil. Cela a pour effet d'inverser ce signal. Le canon accepte indifféremment l'un ou l'autre.


