<?php
/**
 * Calculateur de réglage pour épandeurs Delimbe T24/T28
 * Auteur : Damien Loisel (Dlteck2000)
 * Licence : GNU General Public License v3.0 (GPL-3.0)
 * Année : 2026
 */

$json_data = file_get_contents('php://input');
if ($json_data) {
    file_put_contents('reglages.json', $json_data);
    echo "OK";
}
?>
