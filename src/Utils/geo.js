/**
 * Calculates the geodesic (straight-line) distance between two points on the Earth's surface
 * using the Haversine formula.
 * @param {Object} coords1 - First point coordinates {lat, lng}
 * @param {Object} coords2 - Second point coordinates {lat, lng}
 * @returns {number} Distance in kilometers
 */
export function getHaversineDistance(coords1, coords2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(coords2.lat - coords1.lat);
    const dLon = deg2rad(coords2.lng - coords1.lng);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(coords1.lat)) * Math.cos(deg2rad(coords2.lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
