const EPSILON = 1e-10;

const normalizePoint = (point) => ({
  lat: Number(point?.lat),
  lng: Number(point?.lng)
});

const normalizePolygon = (polygon) => {
  if (!Array.isArray(polygon)) {
    return [];
  }

  return polygon
    .map(normalizePoint)
    .filter(point =>
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng)
    );
};

const pointsEqual = (a, b) =>
  Math.abs(a.lat - b.lat) < EPSILON &&
  Math.abs(a.lng - b.lng) < EPSILON;

const orientation = (a, b, c) => {
  const value =
    (b.lng - a.lng) * (c.lat - b.lat) -
    (b.lat - a.lat) * (c.lng - b.lng);

  if (Math.abs(value) < EPSILON) {
    return 0;
  }

  return value > 0 ? 1 : 2;
};

const onSegment = (a, b, c) =>
  b.lat <= Math.max(a.lat, c.lat) + EPSILON &&
  b.lat + EPSILON >= Math.min(a.lat, c.lat) &&
  b.lng <= Math.max(a.lng, c.lng) + EPSILON &&
  b.lng + EPSILON >= Math.min(a.lng, c.lng) &&
  orientation(a, b, c) === 0;

const segmentsIntersect = (a, b, c, d) => {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  return (
    (o1 === 0 && onSegment(a, c, b)) ||
    (o2 === 0 && onSegment(a, d, b)) ||
    (o3 === 0 && onSegment(c, a, d)) ||
    (o4 === 0 && onSegment(c, b, d))
  );
};

const getEdges = (polygon) =>
  polygon.map((point, index) => [
    point,
    polygon[(index + 1) % polygon.length]
  ]);

const isPointInPolygon = (point, polygon) => {
  const normalizedPolygon =
    normalizePolygon(polygon);

  if (normalizedPolygon.length < 3) {
    return false;
  }

  for (const [start, end] of getEdges(normalizedPolygon)) {
    if (onSegment(start, point, end)) {
      return true;
    }
  }

  let inside = false;

  for (let i = 0, j = normalizedPolygon.length - 1; i < normalizedPolygon.length; j = i++) {
    const current = normalizedPolygon[i];
    const previous = normalizedPolygon[j];
    const intersects =
      current.lng > point.lng !== previous.lng > point.lng &&
      point.lat < (
        (previous.lat - current.lat) *
        (point.lng - current.lng) /
        (previous.lng - current.lng) +
        current.lat
      );

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

const isPolygonInsidePolygon = (childPolygon, parentPolygon) => {
  const child =
    normalizePolygon(childPolygon);
  const parent =
    normalizePolygon(parentPolygon);

  if (child.length < 3 || parent.length < 3) {
    return false;
  }

  const verticesInside =
    child.every(point => isPointInPolygon(point, parent));

  if (!verticesInside) {
    return false;
  }

  const parentEdges =
    getEdges(parent);

  return getEdges(child).every(([childStart, childEnd]) =>
    parentEdges.every(([parentStart, parentEnd]) => {
      if (
        pointsEqual(childStart, parentStart) ||
        pointsEqual(childStart, parentEnd) ||
        pointsEqual(childEnd, parentStart) ||
        pointsEqual(childEnd, parentEnd)
      ) {
        return true;
      }

      return !segmentsIntersect(childStart, childEnd, parentStart, parentEnd);
    })
  );
};

const polygonsOverlap = (firstPolygon, secondPolygon) => {
  const first =
    normalizePolygon(firstPolygon);
  const second =
    normalizePolygon(secondPolygon);

  if (first.length < 3 || second.length < 3) {
    return false;
  }

  const hasIntersectingEdges =
    getEdges(first).some(([firstStart, firstEnd]) =>
      getEdges(second).some(([secondStart, secondEnd]) =>
        segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)
      )
    );

  if (hasIntersectingEdges) {
    return true;
  }

  return (
    first.some(point => isPointInPolygon(point, second)) ||
    second.some(point => isPointInPolygon(point, first))
  );
};

module.exports = {
  isPointInPolygon,
  isPolygonInsidePolygon,
  normalizePolygon,
  polygonsOverlap
};
