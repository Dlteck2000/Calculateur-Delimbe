/**
 * Calculateur de réglage pour épandeurs Delimbe T24/T28
 * Auteur : Damien Loisel (Dlteck2000)
 * Licence : GNU General Public License v3.0 (GPL-3.0)
 * Année : 2026
 */

const tableDebitBase = [
    { n: 1, d: 0.5 }, { n: 2, d: 1.5 }, { n: 3, d: 2.5 }, { n: 4, d: 6.0 },
    { n: 5, d: 10.4 }, { n: 6, d: 15.2 }, { n: 7, d: 21.5 }, { n: 8, d: 26.7 },
    { n: 9, d: 35.5 }, { n: 10, d: 43.2 }, { n: 11, d: 54.5 }, { n: 12, d: 67.6 },
    { n: 13, d: 81.4 }, { n: 14, d: 98.8 }, { n: 15, d: 120.9 }, { n: 16, d: 145.0 },
    { n: 17, d: 171.0 }, { n: 18, d: 197.0 }, { n: 19, d: 220.0 }, { n: 20, d: 235.0 },
    { n: 21, d: 248.0 }, { n: 22, d: 258.0 }, { n: 23, d: 270.0 }, { n: 24, d: 279.0 },
    { n: 25, d: 291.0 }, { n: 26, d: 300.0 }, { n: 27, d: 309.0 }, { n: 28, d: 318.0 },
    { n: 29, d: 327.0 }, { n: 30, d: 351.0 }, { n: 31, d: 371.0 }, { n: 32, d: 391.0 },
    { n: 33, d: 410.0 }, { n: 34, d: 428.0 }, { n: 35, d: 445.0 }
];

async function sauvegarderReglages() {
    const maintenant = new Date();
    const dateFormatee = maintenant.toLocaleDateString('fr-FR') + " à " + 
                         maintenant.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});

    const donnees = {
        modele: document.getElementById("modeleDelimbe").value,
        largeur: document.getElementById("largeurDelimbe").value,
        vitesse: document.getElementById("vitesseDelimbe").value,
        dose: document.getElementById("doseDelimbe").value,
        densite: document.getElementById("densiteDelimbe").value,
        date: dateFormatee
    };

    try {
        await fetch('sauvegarde.php', {
            method: 'POST',
            body: JSON.stringify(donnees),
            headers: { 'Content-Type': 'application/json' }
        });
        document.getElementById("dateCalcul").innerText = dateFormatee;
    } catch (e) { console.error("Erreur de sauvegarde"); }
}

async function chargerReglages() {
    try {
        const reponse = await fetch('reglages.json?v=' + Date.now());
        const donnees = await reponse.json();
        if (donnees.largeur) {
            // On restaure le modèle (T24 par défaut si vide)
            document.getElementById("modeleDelimbe").value = donnees.modele || "T28";
            document.getElementById("largeurDelimbe").value = donnees.largeur;
            document.getElementById("vitesseDelimbe").value = donnees.vitesse;
            document.getElementById("doseDelimbe").value = donnees.dose;
            document.getElementById("densiteDelimbe").value = donnees.densite;
            if (donnees.date) document.getElementById("dateCalcul").innerText = donnees.date;
        }
    } catch (e) { console.log("Initialisation standard"); }
    onButton(false); // Relance le calcul sans sauvegarder par-dessus
}

function onButton(doSave = true) {
    // Récupération des saisies
    const modele = document.getElementById("modeleDelimbe").value;
    const largeurSaisie = parseFloat(document.getElementById("largeurDelimbe").value) || 0;
    const vitesse = parseFloat(document.getElementById("vitesseDelimbe").value) || 0;
    const dose = parseFloat(document.getElementById("doseDelimbe").value) || 0;
    const densite = parseFloat(document.getElementById("densiteDelimbe").value) || 1.0;

    // --- CONFIGURATION ET SÉCURITÉ ---
    const largeurMaxMachine = (modele === "T24") ? 24.0 : 28.0;
    const largeurMinMachine = 4.0;
    
    // On bride le calcul du débit à la largeur réelle maximum de la machine
    const largeurPourCalcul = Math.min(largeurSaisie, largeurMaxMachine);

    // 1. Calcul du Potentiomètre de Largeur (Affichage)
    let elemPotentio = document.getElementById("resPotentiometre");
    if (largeurSaisie <= largeurMinMachine) {
        elemPotentio.innerHTML = "<b>0</b> <span class='w3-medium w3-text-grey'>(Minimum 4m)</span>";
    } else if (largeurSaisie > largeurMaxMachine) {
        elemPotentio.innerHTML = "<b>30</b> <br><span class='w3-medium w3-text-red'>⚠️ Max " + largeurMaxMachine + "m atteint</span>";
    } else {
        let posRaw = (largeurSaisie - largeurMinMachine) * (30 / (largeurMaxMachine - largeurMinMachine));
        elemPotentio.innerHTML = "<b>" + Math.ceil(posRaw) + "</b>";
    }

    // 2. Calculs de débit basés sur la largeur RÉELLE (bridée)
    let haHeure = (largeurPourCalcul * vitesse) / 10;
    let kgHeureReel = dose * haHeure;
    let kgHeureTableau = kgHeureReel / densite;

    document.getElementById("resHaHeure").innerText = haHeure.toFixed(2) + " ha par heure";
    document.getElementById("resKgHeure").innerText = kgHeureReel.toFixed(2) + " Kg par heure";

    // 3. Mise à jour du tableau dynamique
    let tableBody = document.getElementById("tableBodyDelimbe");
    tableBody.innerHTML = "";
    tableDebitBase.forEach(ligne => {
        let debitCorrige = (ligne.d * densite).toFixed(1);
        tableBody.innerHTML += `<tr><td>${ligne.n}</td><td>${ligne.d} Kg</td><td class="w3-text-blue"><b>${debitCorrige} Kg</b></td></tr>`;
    });

    // 4. Calcul de l'Ouverture de Trappe (Interpolation)
    // 4. Calcul de l'Ouverture de Trappe (Interpolation)
    let elemOuverture = document.getElementById("resOuverture");
    const dMin = tableDebitBase[0].d;
    const dMaxTableau = tableDebitBase[34].d; // Le 445.0 kg/h de ta table
    const dMaxReel = (dMaxTableau * densite).toFixed(1); // Le max possible avec TA densité

    if (kgHeureTableau < dMin) {
        elemOuverture.innerHTML = "<span class='w3-text-red w3-medium'>⚠️ Débit trop faible</span>";
    } else if (kgHeureTableau > dMaxTableau) {
        // Affichage du Max avec rappel du débit réel entre parenthèses
        elemOuverture.innerHTML = "<b>35</b> <br><span class='w3-medium w3-text-red'>⚠️ Max atteint (" + dMaxReel + " Kg/h)</span>";
    } else {
        let i = 0;
        while (i < tableDebitBase.length - 1 && kgHeureTableau > tableDebitBase[i+1].d) i++;
        let p1 = tableDebitBase[i], p2 = tableDebitBase[i+1];
        let ouvPrecise = p1.n + (kgHeureTableau - p1.d) * (p2.n - p1.n) / (p2.d - p1.d);
        
        elemOuverture.innerHTML = "<b>" + Math.round(ouvPrecise) + "</b> " +
                                  "<span class='w3-medium w3-text-grey'>(Précis : " + ouvPrecise.toFixed(1) + ")</span>";
    }

    if (doSave) sauvegarderReglages();
}

window.onload = chargerReglages;