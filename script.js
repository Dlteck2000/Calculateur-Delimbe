/**
 * Calculateur de réglage pour épandeurs Delimbe T5 / T24 / T28
 * Auteur : Damien Loisel (Dlteck2000)
 * Licence : GNU General Public License v3.0 (GPL-3.0)
 * Année : 2026
 */

// Table de débit pour T24 et T28 (plateau 230/275mm, densité 1.0, 35 positions)
const tableDebitT24_T28 = [
    { n: 1,  d: 0.5   }, { n: 2,  d: 1.5   }, { n: 3,  d: 2.5   }, { n: 4,  d: 6.0   },
    { n: 5,  d: 10.4  }, { n: 6,  d: 15.2  }, { n: 7,  d: 21.5  }, { n: 8,  d: 26.7  },
    { n: 9,  d: 35.5  }, { n: 10, d: 43.2  }, { n: 11, d: 54.5  }, { n: 12, d: 67.6  },
    { n: 13, d: 81.4  }, { n: 14, d: 98.8  }, { n: 15, d: 120.9 }, { n: 16, d: 145.0 },
    { n: 17, d: 171.0 }, { n: 18, d: 197.0 }, { n: 19, d: 220.0 }, { n: 20, d: 235.0 },
    { n: 21, d: 248.0 }, { n: 22, d: 258.0 }, { n: 23, d: 270.0 }, { n: 24, d: 279.0 },
    { n: 25, d: 291.0 }, { n: 26, d: 300.0 }, { n: 27, d: 309.0 }, { n: 28, d: 318.0 },
    { n: 29, d: 327.0 }, { n: 30, d: 351.0 }, { n: 31, d: 371.0 }, { n: 32, d: 391.0 },
    { n: 33, d: 410.0 }, { n: 34, d: 428.0 }, { n: 35, d: 445.0 }
];

// Table de débit pour T5 (réglage par flasque, 30 positions)
const tableDebitT5 = [
    { n: 1,  d: 0.5  }, { n: 2,  d: 1.5  }, { n: 3,  d: 2.5  }, { n: 4,  d: 5.0  },
    { n: 5,  d: 9.6  }, { n: 6,  d: 13.2 }, { n: 7,  d: 17.4 }, { n: 8,  d: 22.8 },
    { n: 9,  d: 29.4 }, { n: 10, d: 37.2 }, { n: 11, d: 44.4 }, { n: 12, d: 52.8 },
    { n: 13, d: 61.2 }, { n: 14, d: 78.0 }, { n: 15, d: 99.0 }, { n: 16, d: 120.0},
    { n: 17, d: 141.0}, { n: 18, d: 162.0}, { n: 19, d: 180.0}, { n: 20, d: 195.0},
    { n: 21, d: 207.0}, { n: 22, d: 217.0}, { n: 23, d: 228.0}, { n: 24, d: 237.0},
    { n: 25, d: 249.0}, { n: 26, d: 258.0}, { n: 27, d: 267.0}, { n: 28, d: 276.0},
    { n: 29, d: 285.0}, { n: 30, d: 309.0}
];

// Configuration par modèle
const configModeles = {
    "T5":  { table: tableDebitT5,      largeurMin: 3.0, largeurMax: 10.0, potentio: false },
    "T24": { table: tableDebitT24_T28, largeurMin: 4.0, largeurMax: 24.0, potentio: true  },
    "T28": { table: tableDebitT24_T28, largeurMin: 4.0, largeurMax: 28.0, potentio: true  }
};

async function sauvegarderReglages() {
    const maintenant = new Date();
    const dateFormatee = maintenant.toLocaleDateString('fr-FR') + " à " +
        maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const donnees = {
        modele:  document.getElementById("modeleDelimbe").value,
        largeur: document.getElementById("largeurDelimbe").value,
        vitesse: document.getElementById("vitesseDelimbe").value,
        dose:    document.getElementById("doseDelimbe").value,
        densite: document.getElementById("densiteDelimbe").value,
        date:    dateFormatee
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
            document.getElementById("modeleDelimbe").value = donnees.modele || "T24";
            document.getElementById("largeurDelimbe").value = donnees.largeur;
            document.getElementById("vitesseDelimbe").value = donnees.vitesse;
            document.getElementById("doseDelimbe").value = donnees.dose;
            document.getElementById("densiteDelimbe").value = donnees.densite;
            if (donnees.date) document.getElementById("dateCalcul").innerText = donnees.date;
        }
    } catch (e) { console.log("Initialisation standard"); }
    onButton(false);
}

function onButton(doSave = true) {
    const modele = document.getElementById("modeleDelimbe").value;
    const config = configModeles[modele];
    const table  = config.table;

    const largeurSaisie = parseFloat(document.getElementById("largeurDelimbe").value) || 0;
    const vitesse       = parseFloat(document.getElementById("vitesseDelimbe").value) || 0;
    const dose          = parseFloat(document.getElementById("doseDelimbe").value) || 0;
    const densite       = parseFloat(document.getElementById("densiteDelimbe").value) || 1.0;

    const largeurMin  = config.largeurMin;
    const largeurMax  = config.largeurMax;
    const largeurCalc = Math.min(Math.max(largeurSaisie, largeurMin), largeurMax);

    // --- 1. Bloc avertissement largeur (tous modèles, masqué si dans la plage) ---
    const blocLargeur = document.getElementById("blocLargeur");
    if (largeurSaisie < largeurMin) {
        blocLargeur.style.display = "block";
        blocLargeur.innerHTML = "<p>⚠️ Largeur trop faible — minimum : <b>" + largeurMin + "m</b><br>" +
            "<span class='w3-small'>Augmenter la largeur de travail.</span></p>";
    } else if (largeurSaisie > largeurMax) {
        blocLargeur.style.display = "block";
        blocLargeur.innerHTML = "<p>⚠️ Largeur trop grande — maximum : <b>" + largeurMax + "m</b> (calcul bridé)<br>" +
            "<span class='w3-small'>Réduire la largeur de travail.</span></p>";
    } else {
        blocLargeur.style.display = "none";
        blocLargeur.innerHTML = "";
    }

    // --- 2. Potentiomètre (T24 / T28 uniquement) ---
    const blocPotentio = document.getElementById("blocPotentiometre");
    blocPotentio.style.display = config.potentio ? "block" : "none";
    if (config.potentio) {
        let elemPotentio = document.getElementById("resPotentiometre");
        if (largeurSaisie <= largeurMin) {
            elemPotentio.innerHTML = "<b>0</b> <span class='w3-medium w3-text-grey'>(Minimum " + largeurMin + "m)</span>";
        } else if (largeurSaisie > largeurMax) {
            elemPotentio.innerHTML = "<b>30</b> <br><span class='w3-medium w3-text-red'>⚠️ Max " + largeurMax + "m atteint</span>";
        } else {
            let posRaw = (largeurSaisie - largeurMin) * (30 / (largeurMax - largeurMin));
            elemPotentio.innerHTML = "<b>" + Math.ceil(posRaw) + "</b>";
        }
    }

    // --- 3. Calculs de débit ---
    let haHeure    = (largeurCalc * vitesse) / 10;
    let kgHeureReel = dose * haHeure;

    document.getElementById("resHaHeure").innerText = haHeure.toFixed(2) + " ha par heure";
    document.getElementById("resKgHeure").innerText = kgHeureReel.toFixed(2) + " Kg par heure";

    // --- 4. Ouverture de trappe (calculée AVANT le tableau pour surligner) ---
    let elemOuverture = document.getElementById("resOuverture");
    const dMin = table[0].d * densite;
    const dMax = table[table.length - 1].d * densite;
    let ouvertureArrondie = -1;

    if (kgHeureReel < dMin) {
        elemOuverture.innerHTML = "<span class='w3-text-red w3-medium'>⚠️ Débit trop faible<br>" +
            "<span class='w3-small w3-text-red'>Augmenter la dose ou augmenter la vitesse.</span></span>";
    } else if (kgHeureReel > dMax) {
        ouvertureArrondie = table[table.length - 1].n;
        elemOuverture.innerHTML = "<b>" + ouvertureArrondie + "</b>" +
            "<br><span class='w3-medium w3-text-red'>⚠️ Débit max atteint (" + dMax.toFixed(1) + " Kg/h)<br>" +
            "<span class='w3-small'>Baisser la dose ou baisser la vitesse.</span></span>";
    } else {
        let kgHeureTableau = kgHeureReel / densite;
        let i = 0;
        while (i < table.length - 1 && kgHeureTableau > table[i + 1].d) i++;
        let p1 = table[i], p2 = table[i + 1];
        let ouvPrecise = p1.n + (kgHeureTableau - p1.d) * (p2.n - p1.n) / (p2.d - p1.d);
        ouvertureArrondie = Math.round(ouvPrecise);
        elemOuverture.innerHTML = "<b>" + ouvertureArrondie + "</b> " +
            "<span class='w3-medium w3-text-grey'>(Précis : " + ouvPrecise.toFixed(1) + ")</span>";
    }

    // --- 5. Tableau dynamique avec surlignage de la ligne active ---
    let tableBody = document.getElementById("tableBodyDelimbe");
    tableBody.innerHTML = "";
    table.forEach(ligne => {
        let debitCorrige = (ligne.d * densite).toFixed(1);
        const estLigneActive = ligne.n === ouvertureArrondie;
        const styleRow = estLigneActive
            ? "background-color:#fff3cd; font-weight:bold; border-left: 4px solid #f0a500;"
            : "";
        const marqueur = estLigneActive ? " ◀" : "";
        tableBody.innerHTML += `<tr style="${styleRow}">
            <td>${ligne.n}${marqueur}</td>
            <td>${ligne.d} Kg</td>
            <td class="w3-text-blue"><b>${debitCorrige} Kg</b></td>
        </tr>`;
    });

    if (doSave) sauvegarderReglages();
}

window.onload = chargerReglages;
