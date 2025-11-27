/*!
 * Sigil - Standalone Bundle
 * 
 * Animated sigil system. Single ES module, no dependencies.
 * 
 * @example
 *   import { Sigil } from './sigil.standalone.js';
 *   
 *   const sigil = new Sigil({
 *     canvas: document.getElementById('canvas'),
 *     canvasSize: 100,
 *     scale: 1.0,
 *     lineColor: '#fff',
 *     lineWeight: 1.2,
 *     sigilAlphaCoordSize: 100
 *   });
 *   
 *   sigil.thinking();           // Generative mode
 *   sigil.thinkingVaried();     // Varied thinking
 *   sigil.drawSigil({ calls }); // Draw specific sigil
 *   sigil.clear();              // Animated clear
 *   sigil.clear(true);          // Instant clear
 * 
 * @license MIT
 */

// src/player.js
function createPlayer(ctx) {
  const shapes = [];
  let currentShape = [];
  let saveDepth = 0;
  const shapeCompleters = ["stroke", "fill", "fillRect", "strokeRect"];
  const methodsToIntercept = [
    "beginPath",
    "moveTo",
    "lineTo",
    "arc",
    "arcTo",
    "bezierCurveTo",
    "quadraticCurveTo",
    "closePath",
    "stroke",
    "fill",
    "fillRect",
    "strokeRect",
    "save",
    "restore",
    "translate",
    "rotate",
    "scale",
    "setLineDash"
  ];
  const propertiesToIntercept = ["strokeStyle", "fillStyle", "lineWidth", "lineCap", "lineJoin"];
  function completeShape() {
    if (currentShape.length > 0) {
      shapes.push([...currentShape]);
      currentShape = [];
    }
  }
  const wrapped = new Proxy(ctx, {
    get(target, prop) {
      const value = target[prop];
      if (methodsToIntercept.includes(prop) && typeof value === "function") {
        return function(...args) {
          const call = { method: prop, args: [...args] };
          if (prop === "save") {
            saveDepth++;
            currentShape.push(call);
          } else if (prop === "restore") {
            currentShape.push(call);
            saveDepth--;
            if (saveDepth === 0) {
              completeShape();
            }
          } else if (shapeCompleters.includes(prop)) {
            currentShape.push(call);
            if (saveDepth === 0) {
              completeShape();
            }
          } else {
            currentShape.push(call);
          }
          return value.apply(target, args);
        };
      }
      if (typeof value === "function") {
        return value.bind(target);
      }
      if (propertiesToIntercept.includes(prop)) {
        return value;
      }
      return value;
    },
    set(target, prop, value) {
      if (propertiesToIntercept.includes(prop)) {
        currentShape.push({ property: prop, value });
      }
      target[prop] = value;
      return true;
    }
  });
  function resetCanvasState(targetCtx) {
    targetCtx.strokeStyle = "#fff";
    targetCtx.fillStyle = "#fff";
    targetCtx.lineWidth = 6;
    targetCtx.lineCap = "round";
    targetCtx.lineJoin = "round";
  }
  function executeCall(targetCtx, call) {
    if (call.method) {
      targetCtx[call.method](...call.args);
    } else if (call.property) {
      targetCtx[call.property] = call.value;
    }
  }
  function drawWindow(targetCtx, start, end) {
    resetCanvasState(targetCtx);
    for (let i = start; i < end && i < shapes.length; i++) {
      const shape = shapes[i];
      shape.forEach((call) => executeCall(targetCtx, call));
    }
  }
  return {
    ctx: wrapped,
    shapes,
    /**
     * Finalize recording (completes any pending shape)
     */
    finalize() {
      completeShape();
    },
    /**
     * Draw a specific window of shapes
     * @param {CanvasRenderingContext2D} targetCtx - Context to draw to
     * @param {number} start - Start shape index (inclusive)
     * @param {number} end - End shape index (exclusive)
     */
    drawWindow(targetCtx, start, end) {
      drawWindow(targetCtx, start, end);
    },
    /**
     * Draw recorded shapes over a fixed duration (animates end from 0 to length)
     * @param {CanvasRenderingContext2D} targetCtx - Context to draw to
     * @param {number} duration - Total duration in milliseconds (default 300)
     */
    draw(targetCtx, duration = 300) {
      if (shapes.length === 0) return;
      const steps = shapes.length + 1;
      const delayPerStep = duration / steps;
      for (let end = 0; end <= shapes.length; end++) {
        setTimeout(() => {
          drawWindow(targetCtx, 0, end);
        }, end * delayPerStep);
      }
    },
    /**
     * Undraw recorded shapes in reverse (animates end from length to 0)
     * @param {CanvasRenderingContext2D} targetCtx - Context to draw to
     * @param {number} duration - Total duration in milliseconds (default 300)
     */
    undraw(targetCtx, duration = 300) {
      if (shapes.length === 0) return;
      const steps = shapes.length + 1;
      const delayPerStep = duration / steps;
      for (let end = shapes.length; end >= 0; end--) {
        const step = shapes.length - end;
        setTimeout(() => {
          drawWindow(targetCtx, 0, end);
        }, step * delayPerStep);
      }
    },
    /**
     * Clear recorded shapes
     */
    clear() {
      shapes.length = 0;
      currentShape = [];
      saveDepth = 0;
    }
  };
}

// src/primitives.js
function circle(ctx, x, y, r, filled = false) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  filled ? ctx.fill() : ctx.stroke();
}
function dot(ctx, x, y, r = 2) {
  circle(ctx, x, y, r, true);
}
function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function triangle(ctx, x, y, size, direction = "up", filled = false) {
  const h = size * 0.866;
  ctx.beginPath();
  if (direction === "up") {
    ctx.moveTo(x, y - h / 2);
    ctx.lineTo(x - size / 2, y + h / 2);
    ctx.lineTo(x + size / 2, y + h / 2);
  } else if (direction === "down") {
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x - size / 2, y - h / 2);
    ctx.lineTo(x + size / 2, y - h / 2);
  } else if (direction === "left") {
    ctx.moveTo(x - h / 2, y);
    ctx.lineTo(x + h / 2, y - size / 2);
    ctx.lineTo(x + h / 2, y + size / 2);
  } else {
    ctx.moveTo(x + h / 2, y);
    ctx.lineTo(x - h / 2, y - size / 2);
    ctx.lineTo(x - h / 2, y + size / 2);
  }
  ctx.closePath();
  filled ? ctx.fill() : ctx.stroke();
}
function rect(ctx, x, y, w, h, filled = false) {
  if (filled) {
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
  } else {
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  }
}
function wave(ctx, x, y, width, amplitude, freq = 2) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const xPos = x + t * width;
    const yPos = y + Math.sin(t * Math.PI * freq) * amplitude;
    ctx.lineTo(xPos, yPos);
  }
  ctx.stroke();
}
function cross(ctx, x, y, size) {
  line(ctx, x - size / 2, y, x + size / 2, y);
  line(ctx, x, y - size / 2, x, y + size / 2);
}
function xShape(ctx, x, y, size) {
  const half = size / 2;
  line(ctx, x - half, y - half, x + half, y + half);
  line(ctx, x - half, y + half, x + half, y - half);
}
function squareBracket(ctx, x, y, size, dir = "left") {
  const half = size / 2;
  const width = size / 4;
  ctx.beginPath();
  if (dir === "left") {
    ctx.moveTo(x + width, y - half);
    ctx.lineTo(x, y - half);
    ctx.lineTo(x, y + half);
    ctx.lineTo(x + width, y + half);
  } else {
    ctx.moveTo(x - width, y - half);
    ctx.lineTo(x, y - half);
    ctx.lineTo(x, y + half);
    ctx.lineTo(x - width, y + half);
  }
  ctx.stroke();
}
function curveBracket(ctx, x, y, size, dir = "left") {
  const half = size / 2;
  const controlDist = size / 3;
  ctx.beginPath();
  ctx.moveTo(x, y - half);
  if (dir === "left") {
    ctx.bezierCurveTo(
      x - controlDist,
      y - half / 2,
      x - controlDist,
      y + half / 2,
      x,
      y + half
    );
  } else {
    ctx.bezierCurveTo(
      x + controlDist,
      y - half / 2,
      x + controlDist,
      y + half / 2,
      x,
      y + half
    );
  }
  ctx.stroke();
}
function uShape(ctx, x, y, size, dir = "up") {
  const half = size / 2;
  ctx.beginPath();
  if (dir === "up") {
    ctx.moveTo(x - half, y + half);
    ctx.lineTo(x - half, y);
    ctx.arcTo(x, y - half, x + half, y, half);
    ctx.lineTo(x + half, y + half);
  } else if (dir === "down") {
    ctx.moveTo(x - half, y - half);
    ctx.lineTo(x - half, y);
    ctx.arcTo(x, y + half, x + half, y, half);
    ctx.lineTo(x + half, y - half);
  } else if (dir === "left") {
    ctx.moveTo(x + half, y - half);
    ctx.lineTo(x, y - half);
    ctx.arcTo(x - half, y, x, y + half, half);
    ctx.lineTo(x + half, y + half);
  } else {
    ctx.moveTo(x - half, y - half);
    ctx.lineTo(x, y - half);
    ctx.arcTo(x + half, y, x, y + half, half);
    ctx.lineTo(x - half, y + half);
  }
  ctx.stroke();
}
function concentricCircles(ctx, x, y, radii) {
  radii.forEach((r) => {
    circle(ctx, x, y, r, false);
  });
}
function nestedTriangles(ctx, x, y, sizes, dir = "up") {
  sizes.forEach((size) => {
    triangle(ctx, x, y, size, dir, false);
  });
}
function multiRect(ctx, x, y, sizes) {
  sizes.forEach(({ w, h }) => {
    rect(ctx, x, y, w, h, false);
  });
}
function dashedLine(ctx, x1, y1, x2, y2, dashLen = 5) {
  ctx.save();
  ctx.setLineDash([dashLen, dashLen]);
  line(ctx, x1, y1, x2, y2);
  ctx.restore();
}
function generateBezierControls(points, tension = 0.3) {
  if (points.length < 2) return [];
  const controls = [];
  const t = tension;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * t;
    const cp1y = p1.y + (p2.y - p0.y) * t;
    const cp2x = p2.x - (p3.x - p1.x) * t;
    const cp2y = p2.y - (p3.y - p1.y) * t;
    controls.push({ cp1x, cp1y, cp2x, cp2y });
  }
  return controls;
}
function perpendicularOffset(x1, y1, x2, y2, distance, side) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return { x: x1, y: y1 };
  const nx = -dy / length;
  const ny = dx / length;
  return {
    x: x1 + nx * distance * side,
    y: y1 + ny * distance * side
  };
}
function smoothPath(ctx, points, tension = 0.3) {
  if (points.length < 2) return;
  const controls = generateBezierControls(points, tension);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const ctrl = controls[i - 1];
    ctx.bezierCurveTo(
      ctrl.cp1x,
      ctrl.cp1y,
      ctrl.cp2x,
      ctrl.cp2y,
      points[i].x,
      points[i].y
    );
  }
  ctx.stroke();
}
function diamond(ctx, x, y, size, filled = false) {
  const half = size / 2;
  ctx.beginPath();
  ctx.moveTo(x, y - half);
  ctx.lineTo(x + half, y);
  ctx.lineTo(x, y + half);
  ctx.lineTo(x - half, y);
  ctx.closePath();
  filled ? ctx.fill() : ctx.stroke();
}
function crescent(ctx, x, y, size, direction = "right") {
  const r = size / 2;
  const offset = size / 4;
  ctx.save();
  ctx.translate(x, y);
  if (direction === "up") {
    ctx.rotate(-Math.PI / 2);
  } else if (direction === "down") {
    ctx.rotate(Math.PI / 2);
  } else if (direction === "left") {
    ctx.rotate(Math.PI);
  }
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.arc(offset, 0, r * 0.7, Math.PI / 2, -Math.PI / 2, true);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
function lollipop(ctx, x, y, stemLength, circleSize, direction = "up") {
  ctx.save();
  ctx.translate(x, y);
  if (direction === "up") {
    line(ctx, 0, 0, 0, -stemLength);
    circle(ctx, 0, -stemLength, circleSize, false);
  } else if (direction === "down") {
    line(ctx, 0, 0, 0, stemLength);
    circle(ctx, 0, stemLength, circleSize, false);
  } else if (direction === "left") {
    line(ctx, 0, 0, -stemLength, 0);
    circle(ctx, -stemLength, 0, circleSize, false);
  } else {
    line(ctx, 0, 0, stemLength, 0);
    circle(ctx, stemLength, 0, circleSize, false);
  }
  ctx.restore();
}
function cloudEdge(ctx, x, y, width, scallops = 3, orientation = "horizontal") {
  const scallop = width / scallops;
  const radius = scallop / 2;
  ctx.save();
  ctx.translate(x, y);
  if (orientation === "vertical") {
    ctx.rotate(Math.PI / 2);
  }
  ctx.beginPath();
  const startX = -width / 2;
  for (let i = 0; i < scallops; i++) {
    const cx = startX + i * scallop + radius;
    if (i === 0) {
      ctx.moveTo(cx - radius, 0);
    }
    ctx.arc(cx, 0, radius, Math.PI, 0);
  }
  ctx.stroke();
  ctx.restore();
}
function zigzag(ctx, x, y, width, peaks = 3, amplitude = 8, orientation = "horizontal") {
  ctx.save();
  ctx.translate(x, y);
  if (orientation === "vertical") {
    ctx.rotate(Math.PI / 2);
  }
  ctx.beginPath();
  const startX = -width / 2;
  const segmentWidth = width / peaks;
  ctx.moveTo(startX, 0);
  for (let i = 0; i < peaks; i++) {
    const x1 = startX + i * segmentWidth + segmentWidth / 2;
    const x2 = startX + (i + 1) * segmentWidth;
    const yPeak = i % 2 === 0 ? -amplitude : amplitude;
    ctx.lineTo(x1, yPeak);
    ctx.lineTo(x2, 0);
  }
  ctx.stroke();
  ctx.restore();
}
function platform(ctx, x, y, width, stemHeight, direction = "down") {
  const half = width / 2;
  if (direction === "down") {
    line(ctx, x, y - stemHeight, x, y);
    line(ctx, x - half, y, x + half, y);
  } else {
    line(ctx, x - half, y, x + half, y);
    line(ctx, x, y, x, y + stemHeight);
  }
}
function crown(ctx, x, y, width, teeth = 3) {
  const toothWidth = width / (teeth * 2);
  const toothHeight = toothWidth * 1.5;
  ctx.beginPath();
  const startX = x - width / 2;
  ctx.moveTo(startX, y + toothHeight / 2);
  for (let i = 0; i < teeth; i++) {
    const baseX = startX + i * toothWidth * 2;
    ctx.lineTo(baseX, y - toothHeight / 2);
    ctx.lineTo(baseX + toothWidth, y - toothHeight / 2);
    ctx.lineTo(baseX + toothWidth, y + toothHeight / 2);
    if (i < teeth - 1) {
      ctx.lineTo(baseX + toothWidth * 2, y + toothHeight / 2);
    }
  }
  ctx.lineTo(startX + teeth * toothWidth * 2, y + toothHeight / 2);
  ctx.stroke();
}
function ring(ctx, x, y, outerRadius, innerRadius) {
  circle(ctx, x, y, outerRadius, false);
  circle(ctx, x, y, innerRadius, false);
}
function hourglass(ctx, x, y, size, orientation = "vertical") {
  const half = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (orientation === "horizontal") {
    ctx.rotate(Math.PI / 2);
  }
  ctx.beginPath();
  ctx.moveTo(0, -half);
  ctx.lineTo(-half, -half);
  ctx.lineTo(0, 0);
  ctx.lineTo(half, -half);
  ctx.lineTo(0, -half);
  ctx.moveTo(0, half);
  ctx.lineTo(-half, half);
  ctx.lineTo(0, 0);
  ctx.lineTo(half, half);
  ctx.lineTo(0, half);
  ctx.stroke();
  ctx.restore();
}
function branch(ctx, x, y, size, angle = 30, direction = "up") {
  const stemLength = size / 2;
  const branchLength = size / 3;
  const angleRad = angle * Math.PI / 180;
  ctx.save();
  ctx.translate(x, y);
  if (direction === "down") {
    ctx.rotate(Math.PI);
  } else if (direction === "left") {
    ctx.rotate(-Math.PI / 2);
  } else if (direction === "right") {
    ctx.rotate(Math.PI / 2);
  }
  line(ctx, 0, 0, 0, -stemLength);
  const branchStart = -stemLength;
  const leftEndX = -Math.sin(angleRad) * branchLength;
  const leftEndY = branchStart - Math.cos(angleRad) * branchLength;
  const rightEndX = Math.sin(angleRad) * branchLength;
  const rightEndY = branchStart - Math.cos(angleRad) * branchLength;
  line(ctx, 0, branchStart, leftEndX, leftEndY);
  line(ctx, 0, branchStart, rightEndX, rightEndY);
  ctx.restore();
}
function meander(ctx, x, y, width, height, turns = 3, bias = 0) {
  const points = [];
  const segments = turns * 4;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const px = x + t * width;
    const wave2 = Math.sin(t * Math.PI * turns * 2);
    const py = y + wave2 * height + bias * height * 0.3;
    points.push({ x: px, y: py });
  }
  smoothPath(ctx, points, 0.3);
}
function ribbon(ctx, x, y, length, width, waves = 2, bandWidth = 6) {
  const centerPoints = [];
  const segments = waves * 10;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const px = x - length / 2 + t * length;
    const waveVal = Math.sin(t * Math.PI * waves);
    const py = y + waveVal * width;
    centerPoints.push({ x: px, y: py });
  }
  const topEdge = [];
  const bottomEdge = [];
  const offset = bandWidth / 2;
  for (let i = 0; i < centerPoints.length - 1; i++) {
    const p1 = centerPoints[i];
    const p2 = centerPoints[i + 1];
    const topOffset = perpendicularOffset(p1.x, p1.y, p2.x, p2.y, offset, 1);
    const botOffset = perpendicularOffset(p1.x, p1.y, p2.x, p2.y, offset, -1);
    topEdge.push(topOffset);
    bottomEdge.push(botOffset);
  }
  const lastIdx = centerPoints.length - 1;
  const penultIdx = lastIdx - 1;
  topEdge.push(perpendicularOffset(
    centerPoints[penultIdx].x,
    centerPoints[penultIdx].y,
    centerPoints[lastIdx].x,
    centerPoints[lastIdx].y,
    offset,
    1
  ));
  bottomEdge.push(perpendicularOffset(
    centerPoints[penultIdx].x,
    centerPoints[penultIdx].y,
    centerPoints[lastIdx].x,
    centerPoints[lastIdx].y,
    offset,
    -1
  ));
  smoothPath(ctx, topEdge, 0.3);
  smoothPath(ctx, bottomEdge, 0.3);
}
function tendril(ctx, x, y, length, curl = 1.5, direction = "right") {
  const rotations = curl * 1.5;
  const segments = 20;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * rotations * Math.PI * 2;
    const radius = (1 - t) * length;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    points.push({ x: px, y: py });
  }
  ctx.save();
  ctx.translate(x, y);
  if (direction === "left") {
    ctx.rotate(Math.PI);
  } else if (direction === "up") {
    ctx.rotate(-Math.PI / 2);
  } else if (direction === "down") {
    ctx.rotate(Math.PI / 2);
  }
  smoothPath(ctx, points, 0.4);
  ctx.restore();
}

// src/elements.js
function shouldConnect(elem1, elem2, maxDistance = 60) {
  const dx = elem2.x - elem1.x;
  const dy = elem2.y - elem1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance > 0 && distance <= maxDistance;
}
function drawConnection(ctx, from, to, style = "line") {
  if (style === "dashed") {
    dashedLine(ctx, from.x, from.y, to.x, to.y, 3);
  } else if (style === "bridge") {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const perpAngle = Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;
    const bridgeHeight = 8;
    const controlX = midX + Math.cos(perpAngle) * bridgeHeight;
    const controlY = midY + Math.sin(perpAngle) * bridgeHeight;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(controlX, controlY, to.x, to.y);
    ctx.stroke();
  } else {
    line(ctx, from.x, from.y, to.x, to.y);
  }
}
function framedCircle(ctx, x, y, size) {
  circle(ctx, x, y, size / 3, false);
  squareBracket(ctx, x - size / 2, y, size, "left");
  squareBracket(ctx, x + size / 2, y, size, "right");
}
function framedDot(ctx, x, y) {
  dot(ctx, x, y, 3);
  squareBracket(ctx, x - 12, y, 20, "left");
  squareBracket(ctx, x + 12, y, 20, "right");
}
function cupAndCircle(ctx, x, y, size) {
  uShape(ctx, x, y, size, "up");
  circle(ctx, x, y - size / 4, size / 4, false);
}
function framedTriangle(ctx, x, y, size, dir = "up") {
  triangle(ctx, x, y, size / 2, dir, false);
  curveBracket(ctx, x - size / 2, y, size, "left");
  curveBracket(ctx, x + size / 2, y, size, "right");
}
function eye(ctx, x, y, size) {
  const half = size / 2;
  ctx.beginPath();
  ctx.moveTo(x - half, y);
  ctx.bezierCurveTo(x - half / 2, y - half / 2, x + half / 2, y - half / 2, x + half, y);
  ctx.bezierCurveTo(x + half / 2, y + half / 2, x - half / 2, y + half / 2, x - half, y);
  ctx.stroke();
  circle(ctx, x, y, size / 5, true);
}
function concentricEye(ctx, x, y, size) {
  concentricCircles(ctx, x, y, [size / 4, size / 2.5, size / 2]);
  dot(ctx, x, y, size / 8);
}
function stackedTriangles(ctx, x, y, count, spacing) {
  const start = y - (count - 1) * spacing / 2;
  for (let i = 0; i < count; i++) {
    triangle(ctx, x, start + i * spacing, 15, "up", false);
  }
}
function pyramidStack(ctx, x, y) {
  triangle(ctx, x, y - 20, 20, "up", false);
  circle(ctx, x, y, 8, false);
  triangle(ctx, x, y + 20, 20, "down", false);
}
function totemStack(ctx, x, y) {
  circle(ctx, x, y - 25, 8, false);
  line(ctx, x, y - 17, x, y - 8);
  circle(ctx, x, y, 10, false);
  line(ctx, x, y + 10, x, y + 17);
  circle(ctx, x, y + 25, 6, false);
}
function dotTriangle(ctx, x, y, size) {
  const half = size / 2;
  const h = size * 0.866 / 2;
  dot(ctx, x, y - h);
  dot(ctx, x - half, y + h);
  dot(ctx, x + half, y + h);
}
function dotGrid(ctx, x, y, rows, cols, spacing) {
  const startX = x - (cols - 1) * spacing / 2;
  const startY = y - (rows - 1) * spacing / 2;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      dot(ctx, startX + col * spacing, startY + row * spacing);
    }
  }
}
function dotCluster(ctx, x, y) {
  dot(ctx, x, y);
  dot(ctx, x - 8, y - 8);
  dot(ctx, x + 8, y - 8);
  dot(ctx, x, y + 10);
}
function arrowUp(ctx, x, y, size) {
  triangle(ctx, x, y - size / 3, size / 2, "up", true);
  line(ctx, x, y - size / 3, x, y + size / 2);
}
function arrowDown(ctx, x, y, size) {
  triangle(ctx, x, y + size / 3, size / 2, "down", true);
  line(ctx, x, y - size / 2, x, y + size / 3);
}
function chevronStack(ctx, x, y, count, dir = "up") {
  const spacing = 8;
  const start = y - (count - 1) * spacing / 2;
  for (let i = 0; i < count; i++) {
    const yPos = start + i * spacing;
    if (dir === "up") {
      ctx.beginPath();
      ctx.moveTo(x - 10, yPos + 5);
      ctx.lineTo(x, yPos);
      ctx.lineTo(x + 10, yPos + 5);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x - 10, yPos - 5);
      ctx.lineTo(x, yPos);
      ctx.lineTo(x + 10, yPos - 5);
      ctx.stroke();
    }
  }
}
function wave3(ctx, x, y, width) {
  wave(ctx, x - width / 2, y - 8, width, 4, 2);
  wave(ctx, x - width / 2, y, width, 4, 2);
  wave(ctx, x - width / 2, y + 8, width, 4, 2);
}
function crossInCircle(ctx, x, y, size) {
  circle(ctx, x, y, size / 2, false);
  cross(ctx, x, y, size / 1.5);
}
function xInSquare(ctx, x, y, size) {
  rect(ctx, x, y, size, size, false);
  xShape(ctx, x, y, size / 1.3);
}
function nestedSquares(ctx, x, y, size) {
  multiRect(ctx, x, y, [
    { w: size * 0.5, h: size * 0.5 },
    { w: size * 0.75, h: size * 0.75 },
    { w: size, h: size }
  ]);
}
function elementChain(ctx, elements, style = "line") {
  if (elements.length < 2) return;
  for (let i = 0; i < elements.length - 1; i++) {
    const p1 = elements[i];
    const p2 = elements[i + 1];
    if (style === "arrow") {
      line(ctx, p1.x, p1.y, p2.x, p2.y);
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const arrowSize = 5;
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(
        p2.x - arrowSize * Math.cos(angle - Math.PI / 6),
        p2.y - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        p2.x - arrowSize * Math.cos(angle + Math.PI / 6),
        p2.y - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    } else if (style === "dotted") {
      dashedLine(ctx, p1.x, p1.y, p2.x, p2.y, 2);
    } else {
      line(ctx, p1.x, p1.y, p2.x, p2.y);
    }
  }
}
function framedDiamond(ctx, x, y, size) {
  diamond(ctx, x, y, size / 2, false);
  squareBracket(ctx, x - size / 2, y, size, "left");
  squareBracket(ctx, x + size / 2, y, size, "right");
}
function targetRing(ctx, x, y, size) {
  ring(ctx, x, y, size / 2, size / 3);
  circle(ctx, x, y, size / 6, false);
  dot(ctx, x, y, 2);
}
function moonAndStar(ctx, x, y, size) {
  crescent(ctx, x - size / 6, y, size * 0.8, "right");
  dot(ctx, x + size / 3, y - size / 4, 3);
}
function pedestalStack(ctx, x, y) {
  platform(ctx, x, y + 20, 30, 15, "down");
  circle(ctx, x, y, 8, false);
  diamond(ctx, x, y - 15, 12, false);
}
function crownedCircle(ctx, x, y, size) {
  circle(ctx, x, y, size / 2, false);
  crown(ctx, x, y - size / 2, size * 0.8, 3);
}
function branchingTree(ctx, x, y, size) {
  branch(ctx, x, y + size / 3, size, 30, "up");
  branch(ctx, x, y - size / 4, size * 0.6, 25, "up");
}
function diamondLollipops(ctx, x, y, size) {
  diamond(ctx, x, y, size, false);
  const half = size / 2;
  lollipop(ctx, x, y - half, 8, 3, "up");
  lollipop(ctx, x + half, y, 8, 3, "right");
  lollipop(ctx, x, y + half, 8, 3, "down");
  lollipop(ctx, x - half, y, 8, 3, "left");
}
function zigzagSpine(ctx, x, y, size) {
  zigzag(ctx, x, y, size, 3, 8, "vertical");
  dot(ctx, x, y - size / 2, 3);
  dot(ctx, x, y + size / 2, 3);
}
function hourglassChain(ctx, x, y) {
  hourglass(ctx, x, y - 18, 20, "vertical");
  hourglass(ctx, x, y + 18, 20, "vertical");
  line(ctx, x, y - 8, x, y + 8);
}
function meanderSpine(ctx, x, y, size) {
  meander(ctx, x - size / 2, y, size, size / 3, 3, 0);
  dot(ctx, x - size / 2, y, 3);
  dot(ctx, x + size / 2, y, 3);
}
function ribbonBanner(ctx, x, y, size) {
  ribbon(ctx, x, y, size, size / 4, 2, 4);
  circle(ctx, x, y, size / 6, false);
}
function tendrilFrame(ctx, x, y, size) {
  const half = size / 2;
  const tendrilLen = size / 3;
  tendril(ctx, x - half, y - half, tendrilLen, 1.2, "down");
  tendril(ctx, x + half, y - half, tendrilLen, 1.2, "down");
  tendril(ctx, x - half, y + half, tendrilLen, 1.2, "up");
  tendril(ctx, x + half, y + half, tendrilLen, 1.2, "up");
}
function meanderBranch(ctx, x, y, size) {
  meander(ctx, x - size / 2, y, size, size / 3, 3, 0);
  branch(ctx, x - size / 4, y, size / 4, 30, "up");
  branch(ctx, x + size / 4, y, size / 4, 30, "down");
}
function ribbonDots(ctx, x, y, size) {
  ribbon(ctx, x, y, size, size / 4, 2, 4);
  const dotCount = 3;
  for (let i = 0; i < dotCount; i++) {
    const t = i / (dotCount - 1);
    const dotX = x - size / 2 + t * size;
    const waveVal = Math.sin(t * Math.PI * 2);
    const dotY = y + waveVal * (size / 4);
    dot(ctx, dotX, dotY, 2);
  }
}

// src/symmetry.js
function mirrorH(ctx, centerX, drawFn) {
  drawFn();
  ctx.save();
  ctx.translate(centerX, 0);
  ctx.scale(-1, 1);
  ctx.translate(-centerX, 0);
  drawFn();
  ctx.restore();
}
function mirrorV(ctx, centerY, drawFn) {
  drawFn();
  ctx.save();
  ctx.translate(0, centerY);
  ctx.scale(1, -1);
  ctx.translate(0, -centerY);
  drawFn();
  ctx.restore();
}
function radial(ctx, centerX, centerY, count, drawFn) {
  const angleStep = Math.PI * 2 / count;
  for (let i = 0; i < count; i++) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angleStep * i);
    ctx.translate(-centerX, -centerY);
    drawFn();
    ctx.restore();
  }
}
function mirrorBoth(ctx, centerX, centerY, drawFn) {
  drawFn();
  ctx.save();
  ctx.translate(centerX, 0);
  ctx.scale(-1, 1);
  ctx.translate(-centerX, 0);
  drawFn();
  ctx.restore();
  ctx.save();
  ctx.translate(0, centerY);
  ctx.scale(1, -1);
  ctx.translate(0, -centerY);
  drawFn();
  ctx.restore();
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(-1, -1);
  ctx.translate(-centerX, -centerY);
  drawFn();
  ctx.restore();
}
function reflectX(x, centerX) {
  return centerX - (x - centerX);
}
function reflectY(y, centerY) {
  return centerY - (y - centerY);
}

// src/layout.js
function createGrid(centerX = 100, centerY = 100, cellSize = 40) {
  const positions = [];
  const gridSize = 5;
  const offset = (gridSize - 1) * cellSize / 2;
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      positions.push({
        x: centerX - offset + col * cellSize,
        y: centerY - offset + row * cellSize,
        occupied: false,
        row,
        col
      });
    }
  }
  return positions;
}
function getAvailablePositions(grid) {
  return grid.filter((pos) => !pos.occupied);
}
function markOccupied(grid, x, y, tolerance = 5) {
  const pos = grid.find(
    (p) => Math.abs(p.x - x) < tolerance && Math.abs(p.y - y) < tolerance
  );
  if (pos) {
    pos.occupied = true;
  }
}
function getCenterPosition(grid) {
  return grid.find((pos) => pos.row === 2 && pos.col === 2);
}
function alignToAxis(grid, centerX, centerY, axis = "vertical") {
  const tolerance = 5;
  if (axis === "vertical") {
    return grid.filter((pos) => Math.abs(pos.x - centerX) < tolerance);
  } else if (axis === "horizontal") {
    return grid.filter((pos) => Math.abs(pos.y - centerY) < tolerance);
  } else if (axis === "both") {
    return grid.filter(
      (pos) => Math.abs(pos.x - centerX) < tolerance || Math.abs(pos.y - centerY) < tolerance
    );
  }
  return grid;
}
function getAlignedGroup(grid, alignment, targetIndex) {
  if (alignment === "row") {
    return grid.filter((pos) => pos.row === targetIndex);
  } else if (alignment === "column") {
    return grid.filter((pos) => pos.col === targetIndex);
  }
  return [];
}
function getLinearPositions(grid, centerX, centerY, angle = 0) {
  const angleRad = angle * Math.PI / 180;
  const tolerance = 20;
  return grid.filter((pos) => {
    const dx = pos.x - centerX;
    const dy = pos.y - centerY;
    const perpDist = Math.abs(dx * Math.sin(angleRad) - dy * Math.cos(angleRad));
    return perpDist < tolerance;
  }).sort((a, b) => {
    const da = (a.x - centerX) * Math.cos(angleRad) + (a.y - centerY) * Math.sin(angleRad);
    const db = (b.x - centerX) * Math.cos(angleRad) + (b.y - centerY) * Math.sin(angleRad);
    return da - db;
  });
}
function getDiagonalPositions(grid, diagonalType = 45) {
  if (diagonalType === 45) {
    return grid.filter((pos) => pos.row === pos.col);
  } else if (diagonalType === 135) {
    return grid.filter((pos) => pos.row + pos.col === 4);
  }
  return [];
}
function getOptimalSpacing(elementCount, densityMode) {
  if (densityMode === "dense") {
    return 25 + (4 - elementCount) * 3;
  } else if (densityMode === "balanced") {
    return 35 + (4 - elementCount) * 5;
  } else {
    return 55 + (3 - Math.min(elementCount, 3)) * 10;
  }
}
function redistributeForDensity(positions, centerX, centerY, densityMode) {
  if (positions.length < 2) return positions;
  const targetSpacing = getOptimalSpacing(positions.length, densityMode);
  const adjusted = [];
  if (densityMode === "dense") {
    const anchor = positions[0];
    adjusted.push(anchor);
    for (let i = 1; i < positions.length; i++) {
      const angle = i / positions.length * Math.PI * 2;
      adjusted.push({
        x: anchor.x + Math.cos(angle) * targetSpacing,
        y: anchor.y + Math.sin(angle) * targetSpacing,
        occupied: positions[i].occupied,
        row: positions[i].row,
        col: positions[i].col
      });
    }
  } else if (densityMode === "sparse") {
    for (let i = 0; i < positions.length; i++) {
      const angle = i / positions.length * Math.PI * 2;
      adjusted.push({
        x: centerX + Math.cos(angle) * targetSpacing,
        y: centerY + Math.sin(angle) * targetSpacing,
        occupied: positions[i].occupied,
        row: positions[i].row,
        col: positions[i].col
      });
    }
  } else {
    return positions;
  }
  return adjusted;
}

// src/random.js
function createRandom(seed) {
  let x = seed || 123456789;
  let y = 362436069;
  let z = 521288629;
  let w = 88675123;
  x ^= seed;
  y ^= seed >>> 8;
  z ^= seed >>> 16;
  w ^= seed >>> 24;
  return {
    /**
     * Generate random float between 0 and 1
     * @returns {number}
     */
    next() {
      const t = x ^ x << 11;
      x = y;
      y = z;
      z = w;
      w = w ^ w >>> 19 ^ (t ^ t >>> 8);
      return (w >>> 0) / 4294967296;
    },
    /**
     * Generate random integer between min (inclusive) and max (exclusive)
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    int(min, max) {
      return Math.floor(this.next() * (max - min)) + min;
    },
    /**
     * Generate random float between min and max
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    float(min, max) {
      return this.next() * (max - min) + min;
    },
    /**
     * Random boolean with optional probability
     * @param {number} probability - Chance of true (0-1)
     * @returns {boolean}
     */
    bool(probability = 0.5) {
      return this.next() < probability;
    }
  };
}
function pick(arr, rand) {
  return arr[rand.int(0, arr.length)];
}
function weighted(choices, weights, rand) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let random = rand.float(0, total);
  for (let i = 0; i < choices.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return choices[i];
    }
  }
  return choices[choices.length - 1];
}

// src/composer.js
function compose(ctx, seed = Date.now(), coordSize = 200) {
  const rand = createRandom(seed);
  const center = coordSize / 2;
  const centerX = center;
  const centerY = center;
  const scale = coordSize / 200;
  ctx.strokeStyle = "#fff";
  ctx.fillStyle = "#fff";
  ctx.lineWidth = 6 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const grid = createGrid(centerX, centerY, 40 * scale);
  const useTemplate = rand.bool(0.6);
  const TEMPLATES = {
    vertical_stack: {
      elementCount: 3,
      alignmentMode: "axis-aligned",
      densityMode: "balanced",
      anchorMode: "bottom",
      hierarchyMode: "gradient",
      hasSpine: true,
      spineAngle: 0,
      symmetryType: "none"
    },
    symmetric_pair: {
      elementCount: 2,
      alignmentMode: "axis-aligned",
      symmetryType: "horizontal",
      densityMode: "sparse",
      hierarchyMode: "uniform",
      hasSpine: false,
      useChains: true
    },
    radial_burst: {
      elementCount: 4,
      alignmentMode: "free",
      symmetryType: "radial",
      densityMode: "balanced",
      anchorMode: "center",
      hierarchyMode: "uniform",
      hasSpine: false
    },
    diagonal_flow: {
      elementCount: 3,
      alignmentMode: "linear",
      densityMode: "balanced",
      anchorMode: "top",
      hierarchyMode: "focal",
      hasSpine: true,
      spineAngle: 45,
      useChains: true
    },
    framed_focal: {
      elementCount: 3,
      hierarchyMode: "focal",
      densityMode: "sparse",
      anchorMode: "center",
      alignmentMode: "free",
      symmetryType: "none",
      hasSpine: false
    }
  };
  let template = null;
  if (useTemplate) {
    const templateName = weighted(
      Object.keys(TEMPLATES),
      [0.25, 0.2, 0.15, 0.2, 0.2],
      // Weights for each template
      rand
    );
    template = TEMPLATES[templateName];
  }
  const elementCount = template?.elementCount || rand.int(2, 4);
  const hasSpine = template?.hasSpine !== void 0 ? template.hasSpine : rand.bool(0.4);
  const symmetryType = template?.symmetryType || weighted(
    ["none", "horizontal", "vertical", "both", "radial"],
    [0, 0.3, 0.2, 0.25, 0.25],
    // All sigils are symmetrical now
    rand
  );
  const hierarchyMode = template?.hierarchyMode || (rand.bool(0.6) ? weighted(["focal", "gradient"], [0.6, 0.4], rand) : "uniform");
  const assignElementRoles = (count) => {
    const roles = [];
    for (let i = 0; i < count; i++) {
      if (hierarchyMode === "focal") {
        roles.push({
          role: i === 0 ? "primary" : i < 2 ? "secondary" : "accent",
          size: i === 0 ? 1.5 : i < 2 ? 1 : 0.7
        });
      } else if (hierarchyMode === "gradient") {
        const t = i / (count - 1 || 1);
        roles.push({
          role: i < count / 2 ? "primary" : "secondary",
          size: 1.3 - t * 0.6
          // 1.3x to 0.7x
        });
      } else {
        roles.push({
          role: "equal",
          size: 1
        });
      }
    }
    return roles;
  };
  const elementRoles = assignElementRoles(elementCount);
  const anchorMode = template?.anchorMode || (rand.bool(0.7) ? weighted(
    ["bottom", "center", "top", "spine"],
    [0.35, 0.3, 0.2, 0.15],
    rand
  ) : "none");
  const useAnchor = anchorMode !== "none";
  const getAnchorPosition = (grid2) => {
    if (anchorMode === "bottom") {
      return grid2.find((p) => p.row === 3 && p.col === 2) || getCenterPosition(grid2);
    } else if (anchorMode === "center") {
      return getCenterPosition(grid2);
    } else if (anchorMode === "top") {
      return grid2.find((p) => p.row === 1 && p.col === 2) || getCenterPosition(grid2);
    } else if (anchorMode === "spine") {
      return getCenterPosition(grid2);
    }
    return null;
  };
  let spineAngle;
  if (template?.spineAngle !== void 0) {
    spineAngle = template.spineAngle;
  } else if (hasSpine && symmetryType !== "none" && symmetryType !== "radial") {
    if (symmetryType === "horizontal") {
      spineAngle = rand.bool() ? 0 : 180;
    } else if (symmetryType === "vertical") {
      spineAngle = rand.bool() ? 90 : 270;
    } else if (symmetryType === "both") {
      spineAngle = pick([0, 90, 180, 270], rand);
    } else {
      spineAngle = weighted([0, 45, 90, 135], [0.4, 0.2, 0.1, 0.2], rand);
    }
  } else {
    spineAngle = weighted([0, 45, 90, 135], [0.4, 0.2, 0.1, 0.2], rand);
  }
  if (hasSpine && symmetryType !== "radial") {
    const spineLength = rand.float(60 * scale, 100 * scale);
    const halfLength = spineLength / 2;
    const spineType = weighted(["line", "meander", "ribbon"], [0.7, 0.2, 0.1], rand);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(spineAngle * Math.PI / 180);
    if (spineType === "meander") {
      meander(ctx, -halfLength, 0, spineLength, 15 * scale, 3, 0);
    } else if (spineType === "ribbon") {
      ribbon(ctx, 0, 0, spineLength, 12 * scale, 2, 3);
    } else {
      line(ctx, 0, -halfLength, 0, halfLength);
    }
    ctx.restore();
  }
  const allElements = [
    // Framed shapes (common)
    (x, y, s) => framedCircle(ctx, x, y, s),
    (x, y, s) => framedDot(ctx, x, y),
    (x, y, s) => cupAndCircle(ctx, x, y, s),
    (x, y, s) => framedTriangle(ctx, x, y, s, rand.bool() ? "up" : "down"),
    (x, y, s) => framedDiamond(ctx, x, y, s),
    // NEW
    // Eyes (uncommon)
    (x, y, s) => eye(ctx, x, y, s * 0.8),
    (x, y, s) => concentricEye(ctx, x, y, s * 0.8),
    // Stacked shapes (common)
    (x, y, s) => pyramidStack(ctx, x, y),
    (x, y, s) => totemStack(ctx, x, y),
    (x, y, s) => stackedTriangles(ctx, x, y, rand.int(2, 4), 12),
    (x, y, s) => pedestalStack(ctx, x, y),
    // NEW
    // Dot patterns (common)
    (x, y, s) => dotTriangle(ctx, x, y, s),
    (x, y, s) => dotGrid(ctx, x, y, 2, 2, 10),
    (x, y, s) => dotGrid(ctx, x, y, 3, 3, 8),
    (x, y, s) => dotCluster(ctx, x, y),
    // Directional (common)
    (x, y, s) => arrowUp(ctx, x, y, s),
    (x, y, s) => arrowDown(ctx, x, y, s),
    (x, y, s) => chevronStack(ctx, x, y, rand.int(2, 4), "up"),
    // Abstract (common)
    (x, y, s) => wave3(ctx, x, y, s * 1.2),
    (x, y, s) => crossInCircle(ctx, x, y, s),
    (x, y, s) => xInSquare(ctx, x, y, s),
    (x, y, s) => nestedSquares(ctx, x, y, s),
    // NEW compound elements (moderate)
    (x, y, s) => targetRing(ctx, x, y, s),
    (x, y, s) => moonAndStar(ctx, x, y, s),
    (x, y, s) => crownedCircle(ctx, x, y, s),
    (x, y, s) => branchingTree(ctx, x, y, s),
    (x, y, s) => diamondLollipops(ctx, x, y, s),
    (x, y, s) => zigzagSpine(ctx, x, y, s),
    (x, y, s) => hourglassChain(ctx, x, y),
    // Basic primitives enhanced (very common)
    (x, y, s) => concentricCircles(ctx, x, y, [s * 0.3, s * 0.5]),
    (x, y, s) => nestedTriangles(ctx, x, y, [s * 0.5, s * 0.8], rand.bool() ? "up" : "down"),
    (x, y, s) => circle(ctx, x, y, s * 0.5, false),
    (x, y, s) => triangle(ctx, x, y, s * 0.8, rand.bool() ? "up" : "down", false),
    (x, y, s) => squareBracket(ctx, x, y, s, rand.bool() ? "left" : "right"),
    (x, y, s) => curveBracket(ctx, x, y, s, rand.bool() ? "left" : "right"),
    (x, y, s) => uShape(ctx, x, y, s, pick(["up", "down", "left", "right"], rand)),
    (x, y, s) => cross(ctx, x, y, s * 0.7),
    (x, y, s) => xShape(ctx, x, y, s * 0.7),
    (x, y, s) => {
      line(ctx, x - s * 0.6, y, x + s * 0.6, y);
      dot(ctx, x - s * 0.6, y);
      dot(ctx, x + s * 0.6, y);
    },
    // NEW primitives (common - very common)
    (x, y, s) => diamond(ctx, x, y, s * 0.7, false),
    (x, y, s) => ring(ctx, x, y, s * 0.5, s * 0.3),
    (x, y, s) => lollipop(ctx, x, y, s * 0.6, s * 0.2, pick(["up", "down", "left", "right"], rand)),
    (x, y, s) => platform(ctx, x, y, s * 0.8, s * 0.4, rand.bool() ? "up" : "down"),
    (x, y, s) => crescent(ctx, x, y, s, pick(["left", "right", "up", "down"], rand)),
    (x, y, s) => branch(ctx, x, y, s, rand.int(20, 40), pick(["up", "down", "left", "right"], rand)),
    (x, y, s) => zigzag(ctx, x, y, s, 3, 8, rand.bool() ? "horizontal" : "vertical"),
    (x, y, s) => hourglass(ctx, x, y, s * 0.7, rand.bool() ? "vertical" : "horizontal"),
    (x, y, s) => crown(ctx, x, y, s, 3),
    (x, y, s) => cloudEdge(ctx, x, y, s, 4, rand.bool() ? "horizontal" : "vertical"),
    // NEW organic curve primitives (moderate to uncommon)
    (x, y, s) => meander(ctx, x - s / 2, y, s, s / 3, rand.int(2, 4), 0),
    (x, y, s) => ribbon(ctx, x, y, s * 1.2, s / 3, rand.int(2, 3), 4),
    (x, y, s) => tendril(ctx, x, y, s * 0.6, rand.float(1, 1.8), pick(["left", "right", "up", "down"], rand)),
    // NEW organic curve compounds (uncommon)
    (x, y, s) => meanderSpine(ctx, x, y, s),
    (x, y, s) => ribbonBanner(ctx, x, y, s),
    (x, y, s) => tendrilFrame(ctx, x, y, s),
    (x, y, s) => meanderBranch(ctx, x, y, s),
    (x, y, s) => ribbonDots(ctx, x, y, s)
  ];
  const weights = [
    // Framed (common)
    1.5,
    1.5,
    1,
    1.5,
    1.5,
    // Eyes (uncommon)
    0.5,
    0.5,
    // Stacked (common)
    1.2,
    1.2,
    1,
    1.5,
    // Dots (common)
    1.5,
    1.2,
    1,
    1.5,
    // Directional (common)
    1,
    1,
    1,
    // Abstract (common)
    1,
    1,
    1,
    1,
    // NEW compounds (moderate)
    1.5,
    1.2,
    0.9,
    1.2,
    0.8,
    1,
    0.8,
    // Primitives (very common)
    2,
    2,
    2.5,
    2.5,
    1.5,
    1.5,
    1.5,
    2,
    2,
    1.5,
    // NEW primitives (common to uncommon)
    2,
    2,
    1.5,
    1.5,
    1.2,
    1.2,
    1,
    0.8,
    0.7,
    0.6,
    // NEW organic curves (moderate to uncommon)
    1,
    1.2,
    0.8,
    // NEW organic curve compounds (uncommon)
    0.9,
    1,
    0.7,
    0.8,
    0.9
  ];
  const selectedElements = [];
  for (let i = 0; i < elementCount; i++) {
    selectedElements.push(weighted(allElements, weights, rand));
  }
  const alignmentMode = template?.alignmentMode || weighted(
    ["axis-aligned", "grid-aligned", "linear", "free"],
    [0.4, 0.3, 0.2, 0.1],
    rand
  );
  const usePathBased = symmetryType === "none" && rand.bool(0.3);
  let positions = [];
  if (usePathBased) {
    const pathType = weighted(["arc", "sCurve", "line"], [0.4, 0.3, 0.3], rand);
    const pathPoints = [];
    if (pathType === "arc") {
      const radius = 50 * scale;
      const startAngle = -Math.PI / 3;
      const endAngle = Math.PI / 3;
      for (let i = 0; i < elementCount; i++) {
        const t = i / (elementCount - 1 || 1);
        const angle = startAngle + t * (endAngle - startAngle);
        pathPoints.push({
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          occupied: false
        });
      }
    } else if (pathType === "sCurve") {
      const width = 60 * scale;
      const height = 40 * scale;
      for (let i = 0; i < elementCount; i++) {
        const t = i / (elementCount - 1 || 1);
        const x = centerX - width / 2 + t * width;
        const y = centerY + Math.sin(t * Math.PI) * height;
        pathPoints.push({ x, y, occupied: false });
      }
    } else {
      const angle = rand.float(0, Math.PI * 2);
      const length = 60 * scale;
      for (let i = 0; i < elementCount; i++) {
        const t = i / (elementCount - 1 || 1) - 0.5;
        const x = centerX + Math.cos(angle) * t * length;
        const y = centerY + Math.sin(angle) * t * length;
        pathPoints.push({ x, y, occupied: false });
      }
    }
    positions = pathPoints;
  } else {
    let availablePositions = getAvailablePositions(grid);
    if (alignmentMode === "axis-aligned") {
      const axisType = symmetryType === "horizontal" ? "vertical" : symmetryType === "vertical" ? "horizontal" : weighted(["vertical", "horizontal", "both"], [0.5, 0.3, 0.2], rand);
      availablePositions = alignToAxis(availablePositions, centerX, centerY, axisType);
    } else if (alignmentMode === "grid-aligned") {
      const alignType = rand.bool() ? "row" : "column";
      const alignIndex = rand.int(1, 4);
      const alignedGroup = getAlignedGroup(grid, alignType, alignIndex);
      availablePositions = alignedGroup.filter((p) => !p.occupied);
    } else if (alignmentMode === "linear") {
      if (hasSpine) {
        availablePositions = getLinearPositions(grid, centerX, centerY, spineAngle);
      } else {
        const diag = rand.bool() ? 45 : 135;
        availablePositions = getDiagonalPositions(grid, diag);
      }
    }
    if (availablePositions.length === 0) {
      availablePositions = getAvailablePositions(grid);
    }
    if (symmetryType === "none") {
      if (useAnchor && anchorMode !== "spine") {
        const anchorPos = getAnchorPosition(grid);
        if (anchorPos && !anchorPos.occupied) {
          positions.push(anchorPos);
          markOccupied(grid, anchorPos.x, anchorPos.y);
          availablePositions = availablePositions.filter((p) => p !== anchorPos);
        }
      }
      for (let i = positions.length; i < elementCount; i++) {
        if (availablePositions.length === 0) break;
        const pos = pick(availablePositions, rand);
        positions.push(pos);
        markOccupied(grid, pos.x, pos.y);
        availablePositions = availablePositions.filter((p) => p !== pos);
      }
    } else if (symmetryType === "horizontal") {
      const rightSide = availablePositions.filter((p) => p.col >= 2 && !p.occupied);
      for (let i = 0; i < elementCount && i < rightSide.length; i++) {
        const pos = pick(rightSide, rand);
        positions.push(pos);
        markOccupied(grid, pos.x, pos.y);
        const mirroredX = reflectX(pos.x, centerX);
        markOccupied(grid, mirroredX, pos.y);
        const mirroredPos = grid.find((p) => Math.abs(p.x - mirroredX) < 5 && Math.abs(p.y - pos.y) < 5);
        if (mirroredPos) {
          mirroredPos.occupied = true;
        }
      }
    } else if (symmetryType === "vertical") {
      const topHalf = availablePositions.filter((p) => p.row <= 2 && !p.occupied);
      for (let i = 0; i < elementCount && i < topHalf.length; i++) {
        const pos = pick(topHalf, rand);
        positions.push(pos);
        markOccupied(grid, pos.x, pos.y);
        const mirroredY = reflectY(pos.y, centerY);
        markOccupied(grid, pos.x, mirroredY);
        const mirroredPos = grid.find((p) => Math.abs(p.x - pos.x) < 5 && Math.abs(p.y - mirroredY) < 5);
        if (mirroredPos) {
          mirroredPos.occupied = true;
        }
      }
    } else if (symmetryType === "both") {
      const topRightQuad = availablePositions.filter((p) => p.row <= 2 && p.col >= 2 && !p.occupied);
      for (let i = 0; i < elementCount && i < topRightQuad.length; i++) {
        const pos = pick(topRightQuad, rand);
        positions.push(pos);
        markOccupied(grid, pos.x, pos.y);
        const mirroredX = reflectX(pos.x, centerX);
        const mirroredY = reflectY(pos.y, centerY);
        markOccupied(grid, mirroredX, pos.y);
        markOccupied(grid, pos.x, mirroredY);
        markOccupied(grid, mirroredX, mirroredY);
        [mirroredX, pos.x].forEach((x) => {
          [mirroredY, pos.y].forEach((y) => {
            const quadPos = grid.find((p) => Math.abs(p.x - x) < 5 && Math.abs(p.y - y) < 5);
            if (quadPos) {
              quadPos.occupied = true;
            }
          });
        });
      }
    } else {
      positions.push(getCenterPosition(grid));
    }
  }
  const useChains = (template?.useChains !== void 0 ? template.useChains : rand.bool(0.5)) && positions.length >= 2;
  const useProximityConnections = !useChains && rand.bool(0.3) && positions.length >= 2;
  if (useChains && positions.length >= 2) {
    const chainStyle = weighted(["line", "arrow", "dotted"], [0.5, 0.3, 0.2], rand);
    const basePositions = positions.map((p) => ({ x: p.x, y: p.y }));
    if (symmetryType === "none") {
      elementChain(ctx, basePositions, chainStyle);
    } else if (symmetryType === "horizontal") {
      mirrorH(ctx, centerX, () => {
        elementChain(ctx, basePositions, chainStyle);
      });
    } else if (symmetryType === "vertical") {
      mirrorV(ctx, centerY, () => {
        elementChain(ctx, basePositions, chainStyle);
      });
    } else if (symmetryType === "both") {
      mirrorBoth(ctx, centerX, centerY, () => {
        elementChain(ctx, basePositions, chainStyle);
      });
    } else if (symmetryType === "radial") {
      radial(ctx, centerX, centerY, 4, () => {
        elementChain(ctx, basePositions, chainStyle);
      });
    }
  } else if (useProximityConnections) {
    const connectionStyle = weighted(["line", "dashed", "bridge"], [0.5, 0.3, 0.2], rand);
    const maxConnections = Math.min(3, Math.floor(positions.length / 2));
    let connectionsDrawn = 0;
    const connections = [];
    for (let i = 0; i < positions.length && connectionsDrawn < maxConnections; i++) {
      for (let j = i + 1; j < positions.length && connectionsDrawn < maxConnections; j++) {
        if (shouldConnect(positions[i], positions[j], 60 * scale)) {
          connections.push({ from: positions[i], to: positions[j] });
          connectionsDrawn++;
        }
      }
    }
    if (symmetryType === "none") {
      connections.forEach((conn) => {
        drawConnection(ctx, conn.from, conn.to, connectionStyle);
      });
    } else if (symmetryType === "horizontal") {
      mirrorH(ctx, centerX, () => {
        connections.forEach((conn) => {
          drawConnection(ctx, conn.from, conn.to, connectionStyle);
        });
      });
    } else if (symmetryType === "vertical") {
      mirrorV(ctx, centerY, () => {
        connections.forEach((conn) => {
          drawConnection(ctx, conn.from, conn.to, connectionStyle);
        });
      });
    } else if (symmetryType === "both") {
      mirrorBoth(ctx, centerX, centerY, () => {
        connections.forEach((conn) => {
          drawConnection(ctx, conn.from, conn.to, connectionStyle);
        });
      });
    } else if (symmetryType === "radial") {
      radial(ctx, centerX, centerY, 4, () => {
        connections.forEach((conn) => {
          drawConnection(ctx, conn.from, conn.to, connectionStyle);
        });
      });
    }
  }
  const hasElementRotation = rand.bool(0.3);
  let elementRotation = 0;
  if (hasElementRotation) {
    if (symmetryType === "horizontal" || symmetryType === "vertical") {
      elementRotation = rand.bool() ? 0 : 180;
    } else if (symmetryType === "radial") {
      const radialCount = 4;
      const angleStep = 360 / radialCount;
      const rotations = [0, angleStep, angleStep * 2, angleStep * 3];
      elementRotation = pick(rotations, rand);
    } else if (symmetryType === "both") {
      elementRotation = pick([0, 90, 180, 270], rand);
    } else {
      elementRotation = rand.float(-30, 30);
    }
  }
  const hasSecondaryAxis = rand.bool(0.4);
  const secondaryAxisType = hasSecondaryAxis ? weighted(["horizontal", "diagonal"], [0.6, 0.4], rand) : null;
  const getSizeMultiplier = (index) => {
    return elementRoles[index]?.size || 1;
  };
  const drawElement = (element, pos, index, rotation = 0, sizeMultiplier = 1) => {
    if (!pos) return;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    if (rotation !== 0) {
      ctx.rotate(rotation * Math.PI / 180);
    }
    const size = 25 * scale * sizeMultiplier;
    element(0, 0, size);
    ctx.restore();
  };
  if (hasSecondaryAxis && secondaryAxisType) {
    ctx.save();
    if (secondaryAxisType === "horizontal") {
      line(ctx, centerX - 40 * scale, centerY, centerX + 40 * scale, centerY);
    } else if (secondaryAxisType === "diagonal") {
      const angle = rand.bool() ? 45 : 135;
      const len = 60 * scale;
      ctx.translate(centerX, centerY);
      ctx.rotate(angle * Math.PI / 180);
      line(ctx, -len / 2, 0, len / 2, 0);
      ctx.restore();
    }
    if (secondaryAxisType !== "diagonal") ctx.restore();
  }
  const densityMode = template?.densityMode || weighted(["balanced", "dense", "sparse"], [0.4, 0.3, 0.3], rand);
  if (!usePathBased && positions.length >= 2) {
    positions = redistributeForDensity(positions, centerX, centerY, densityMode);
  }
  if (symmetryType === "none") {
    positions.forEach((pos, i) => {
      if (i < selectedElements.length) {
        const rot = hasElementRotation ? elementRotation : 0;
        const sizeMult = getSizeMultiplier(i);
        drawElement(selectedElements[i], pos, i, rot, sizeMult);
      }
    });
  } else if (symmetryType === "horizontal") {
    positions.forEach((pos, i) => {
      if (i < selectedElements.length) {
        mirrorH(ctx, centerX, () => {
          const rot = hasElementRotation ? elementRotation : 0;
          const sizeMult = getSizeMultiplier(i);
          drawElement(selectedElements[i], pos, i, rot, sizeMult);
        });
      }
    });
  } else if (symmetryType === "vertical") {
    positions.forEach((pos, i) => {
      if (i < selectedElements.length) {
        mirrorV(ctx, centerY, () => {
          const rot = hasElementRotation ? elementRotation : 0;
          const sizeMult = getSizeMultiplier(i);
          drawElement(selectedElements[i], pos, i, rot, sizeMult);
        });
      }
    });
  } else if (symmetryType === "both") {
    positions.forEach((pos, i) => {
      if (i < selectedElements.length) {
        mirrorBoth(ctx, centerX, centerY, () => {
          const rot = hasElementRotation ? elementRotation : 0;
          const sizeMult = getSizeMultiplier(i);
          drawElement(selectedElements[i], pos, i, rot, sizeMult);
        });
      }
    });
  } else if (symmetryType === "radial") {
    const radialCount = weighted([4, 8], [0.7, 0.3], rand);
    const centerPos = positions[0];
    const element = selectedElements[0];
    if (centerPos && element) {
      radial(ctx, centerX, centerY, radialCount, () => {
        const offsetY = -30 * scale;
        element(centerX, centerY + offsetY, 20 * scale);
      });
    }
    if (hasElementRotation && elementRotation !== 0) {
      const angleStep = 360 / radialCount;
      const rotations = [];
      for (let i = 0; i < radialCount; i++) {
        rotations.push(i * angleStep);
      }
      elementRotation = pick(rotations, rand);
    }
  }
  const hasAccentLayer = rand.bool(0.3);
  if (hasAccentLayer) {
    const accentCount = rand.int(1, 4);
    for (let i = 0; i < accentCount; i++) {
      const available = getAvailablePositions(grid);
      if (available.length > 0) {
        const pos = pick(available, rand);
        const accentType = weighted(
          ["dot", "smallLine", "tinyCircle", "dotCluster"],
          [0.4, 0.3, 0.2, 0.1],
          rand
        );
        if (accentType === "dot") {
          dot(ctx, pos.x, pos.y, 1.5);
        } else if (accentType === "smallLine") {
          const angle = rand.float(0, Math.PI * 2);
          const len = 8;
          const x2 = pos.x + Math.cos(angle) * len;
          const y2 = pos.y + Math.sin(angle) * len;
          line(ctx, pos.x, pos.y, x2, y2);
        } else if (accentType === "tinyCircle") {
          circle(ctx, pos.x, pos.y, 4, false);
        } else if (accentType === "dotCluster") {
          dot(ctx, pos.x - 3, pos.y, 1);
          dot(ctx, pos.x, pos.y, 1);
          dot(ctx, pos.x + 3, pos.y, 1);
        }
      }
    }
  }
  const hasDepthLayers = false;
  if (hasDepthLayers && positions.length > 1) {
    const bgIndex = rand.int(0, Math.min(2, positions.length));
    if (positions[bgIndex] && selectedElements[bgIndex]) {
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#fff";
      const bgPos = positions[bgIndex];
      ctx.translate(bgPos.x, bgPos.y);
      const bgSize = 30 * scale;
      circle(ctx, 0, 0, bgSize * 0.6, true);
      ctx.restore();
    }
  }
}

// src/glyphgen-adapter.js
function parseGlyphgenCalls(callsString) {
  let code = callsString.trim();
  if (code.startsWith("```")) {
    const lines = code.split("\n");
    lines.shift();
    if (lines[lines.length - 1].trim() === "```") {
      lines.pop();
    }
    code = lines.join("\n");
  }
  const shapes = [];
  let currentShape = [];
  const methodCallRegex = /ctx\.(\w+)\(([^)]*)\)/g;
  const propertySetRegex = /ctx\.(\w+)\s*=\s*([^;]+);/g;
  let inPath = false;
  const calls = [];
  let match;
  while ((match = methodCallRegex.exec(code)) !== null) {
    const method = match[1];
    const argsStr = match[2];
    const args = parseArgs(argsStr);
    calls.push({ method, args });
  }
  const propertyRegex = /ctx\.(\w+)\s*=\s*([^;]+);/g;
  while ((match = propertyRegex.exec(code)) !== null) {
    const prop = match[1];
    const valueStr = match[2].trim();
    const value = parseValue(valueStr);
    calls.push({ property: prop, value });
  }
  for (const call of calls) {
    if (call.method === "beginPath") {
      if (currentShape.length > 0) {
        shapes.push([...currentShape]);
      }
      currentShape = [call];
      inPath = true;
    } else if (call.method === "stroke" || call.method === "fill") {
      currentShape.push(call);
      shapes.push([...currentShape]);
      currentShape = [];
      inPath = false;
    } else if (call.property) {
      currentShape.push(call);
    } else {
      currentShape.push(call);
    }
  }
  if (currentShape.length > 0) {
    shapes.push([...currentShape]);
  }
  return shapes;
}
function parseArgs(argsStr) {
  if (!argsStr.trim()) return [];
  const args = [];
  let current = "";
  let depth = 0;
  let inString = false;
  let stringChar = null;
  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i];
    if ((char === '"' || char === "'") && (i === 0 || argsStr[i - 1] !== "\\")) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
      current += char;
    } else if (!inString && char === "(") {
      depth++;
      current += char;
    } else if (!inString && char === ")") {
      depth--;
      current += char;
    } else if (!inString && depth === 0 && char === ",") {
      args.push(parseValue(current.trim()));
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    args.push(parseValue(current.trim()));
  }
  return args;
}
function parseValue(valueStr) {
  valueStr = valueStr.trim();
  if (valueStr.startsWith('"') && valueStr.endsWith('"') || valueStr.startsWith("'") && valueStr.endsWith("'")) {
    return valueStr.slice(1, -1);
  }
  if (valueStr.includes("Math.PI")) {
    const piValue = Math.PI;
    if (valueStr === "Math.PI") {
      return piValue;
    } else if (valueStr === "Math.PI * 2") {
      return Math.PI * 2;
    } else if (valueStr === "2 * Math.PI") {
      return Math.PI * 2;
    }
    const multMatch = valueStr.match(/Math\.PI\s*\*\s*(\d+)|(\d+)\s*\*\s*Math\.PI/);
    if (multMatch) {
      const n = parseFloat(multMatch[1] || multMatch[2]);
      return piValue * n;
    }
  }
  const num = parseFloat(valueStr);
  if (!isNaN(num)) {
    return num;
  }
  if (valueStr === "true") return true;
  if (valueStr === "false") return false;
  return valueStr;
}
function createPlayerFromShapes(shapes) {
  function resetCanvasState(targetCtx) {
    targetCtx.strokeStyle = "#fff";
    targetCtx.fillStyle = "#fff";
    targetCtx.lineWidth = 1.2;
    targetCtx.lineCap = "round";
    targetCtx.lineJoin = "round";
  }
  function executeCall(targetCtx, call) {
    if (call.method) {
      targetCtx[call.method](...call.args);
    } else if (call.property) {
      targetCtx[call.property] = call.value;
    }
  }
  function drawWindow(targetCtx, start, end) {
    resetCanvasState(targetCtx);
    for (let i = start; i < end && i < shapes.length; i++) {
      const shape = shapes[i];
      shape.forEach((call) => executeCall(targetCtx, call));
    }
  }
  return {
    shapes,
    drawWindow(targetCtx, start, end) {
      drawWindow(targetCtx, start, end);
    },
    draw(targetCtx, duration = 300) {
      if (shapes.length === 0) return;
      const steps = shapes.length + 1;
      const delayPerStep = duration / steps;
      for (let end = 0; end <= shapes.length; end++) {
        setTimeout(() => {
          drawWindow(targetCtx, 0, end);
        }, end * delayPerStep);
      }
    },
    undraw(targetCtx, duration = 300) {
      if (shapes.length === 0) return;
      const steps = shapes.length + 1;
      const delayPerStep = duration / steps;
      for (let end = shapes.length; end >= 0; end--) {
        const step = shapes.length - end;
        setTimeout(() => {
          drawWindow(targetCtx, 0, end);
        }, step * delayPerStep);
      }
    }
  };
}

// src/sigil.js
var Sigil = class {
  /**
   * Create a new Sigil instance
   * @param {Object} config - Configuration object
   * @param {HTMLCanvasElement} config.canvas - Target canvas element (required)
   * @param {number} [config.canvasSize] - Fixed canvas size (if not provided, uses full viewport)
   * @param {number} [config.drawDuration=50] - Duration of draw animation in ms
   * @param {number} [config.undrawDuration=50] - Duration of undraw animation in ms
   * @param {number} [config.thinkingShiftInterval=100] - ms between frames when shifting seeds
   * @param {number} [config.thinkingShiftDelay=1500] - ms to display each seed before shifting
   * @param {number} [config.thinkingVariedMin=1000] - Min ms between varied thinking cycles
   * @param {number} [config.thinkingVariedMax=3000] - Max ms between varied thinking cycles
   * @param {number} [config.scale=0.25] - Scale factor (0.25 = quarter size)
   * @param {string} [config.lineColor='#fff'] - Color for lines
   * @param {number} [config.lineWeight=1.2] - Base line weight for glyphgen (SigilAlpha uses 2x)
   * @param {number} [config.sigilAlphaCoordSize=200] - SigilAlpha coordinate system size
   */
  constructor(config) {
    if (!config || !config.canvas) {
      throw new Error("Sigil: canvas is required in config");
    }
    if (!(config.canvas instanceof HTMLCanvasElement)) {
      throw new Error("Sigil: canvas must be an HTMLCanvasElement");
    }
    this.canvas = config.canvas;
    this.ctx = this.canvas.getContext("2d");
    this.canvasSize = config.canvasSize || null;
    this.drawDuration = config.drawDuration ?? 50;
    this.undrawDuration = config.undrawDuration ?? 50;
    this.thinkingShiftInterval = config.thinkingShiftInterval ?? 100;
    this.thinkingShiftDelay = config.thinkingShiftDelay ?? 1500;
    this.thinkingVariedMin = config.thinkingVariedMin ?? 1e3;
    this.thinkingVariedMax = config.thinkingVariedMax ?? 3e3;
    this.scale = config.scale ?? 0.25;
    this.lineColor = config.lineColor ?? "#fff";
    this.lineWeight = config.lineWeight ?? 1.2;
    this.sigilAlphaCoordSize = config.sigilAlphaCoordSize ?? 200;
    if (this.drawDuration < 0) throw new Error("Sigil: drawDuration must be >= 0");
    if (this.undrawDuration < 0) throw new Error("Sigil: undrawDuration must be >= 0");
    if (this.thinkingShiftInterval < 0) throw new Error("Sigil: thinkingShiftInterval must be >= 0");
    if (this.thinkingShiftDelay < 0) throw new Error("Sigil: thinkingShiftDelay must be >= 0");
    if (this.thinkingVariedMin < 0) throw new Error("Sigil: thinkingVariedMin must be >= 0");
    if (this.thinkingVariedMax < 0) throw new Error("Sigil: thinkingVariedMax must be >= 0");
    if (this.thinkingVariedMin > this.thinkingVariedMax) throw new Error("Sigil: thinkingVariedMin must be <= thinkingVariedMax");
    if (this.scale <= 0) throw new Error("Sigil: scale must be > 0");
    if (this.lineWeight <= 0) throw new Error("Sigil: lineWeight must be > 0");
    this._setupCanvas();
    this.state = {
      mode: "idle",
      // 'idle' | 'thinking' | 'drawing'
      currentPlayer: null,
      // Current player instance
      currentShapeIndex: 0,
      // Current position in animation (0 = blank)
      maxShapes: 0,
      // Total shapes in current player
      isAnimating: false,
      // True during draw/undraw
      thinkingIntervalId: null,
      // Interval ID for seed shifting
      thinkingSeed: null,
      // Current thinking mode seed
      isThinkingVaried: false,
      // Flag for varied thinking mode
      thinkingVariedTimeoutId: null,
      // Timeout ID for varied thinking cycles
      activeTimeouts: []
      // All pending timeouts for cancellation
    };
    this._clearCanvas();
  }
  /**
   * Setup canvas with retina support and sizing
   * @private
   */
  _setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    let logicalWidth, logicalHeight;
    if (this.canvasSize) {
      logicalWidth = this.canvasSize;
      logicalHeight = this.canvasSize;
    } else {
      logicalWidth = window.innerWidth;
      logicalHeight = window.innerHeight;
    }
    this.canvas.width = logicalWidth * dpr;
    this.canvas.height = logicalHeight * dpr;
    this.canvas.style.width = logicalWidth + "px";
    this.canvas.style.height = logicalHeight + "px";
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;
    this.dpr = dpr;
    this.drawingSize = Math.min(logicalWidth, logicalHeight) * 0.8;
  }
  /**
   * Clear canvas to transparent
   * @private
   */
  _clearCanvas() {
    this.ctx.save();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
    this.ctx.restore();
  }
  /**
   * Setup context for SigilAlpha mode (configurable coordinate system)
   * @private
   */
  _setupSigilAlphaContext() {
    this.ctx.save();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const glyphgenScale = this.drawingSize / 100 * this.scale;
    const scale = glyphgenScale * (100 / this.sigilAlphaCoordSize);
    const offsetX = (this.logicalWidth - this.drawingSize) / 2;
    const offsetY = (this.logicalHeight - this.drawingSize) / 2;
    this.ctx.translate(offsetX, offsetY);
    this.ctx.translate(this.drawingSize / 2, this.drawingSize / 2);
    this.ctx.scale(scale, scale);
    const center = this.sigilAlphaCoordSize / 2;
    this.ctx.translate(-center, -center);
  }
  /**
   * Setup context for Glyphgen mode (100x100 coordinate system)
   * @private
   */
  _setupGlyphgenContext() {
    this.ctx.save();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const scale = this.drawingSize / 100 * this.scale;
    const offsetX = (this.logicalWidth - this.drawingSize) / 2;
    const offsetY = (this.logicalHeight - this.drawingSize) / 2;
    this.ctx.translate(offsetX, offsetY);
    this.ctx.translate(this.drawingSize / 2, this.drawingSize / 2);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-50, -50);
  }
  /**
   * Cancel all active animations and intervals
   * @private
   */
  _cancelAllAnimations() {
    this.state.activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.state.activeTimeouts = [];
    if (this.state.thinkingIntervalId !== null) {
      clearInterval(this.state.thinkingIntervalId);
      this.state.thinkingIntervalId = null;
    }
    if (this.state.thinkingVariedTimeoutId !== null) {
      clearTimeout(this.state.thinkingVariedTimeoutId);
      this.state.thinkingVariedTimeoutId = null;
    }
    this.state.isAnimating = false;
  }
  /**
   * Undraw from current position to blank
   * @private
   * @param {Function} onComplete - Called when undraw completes
   */
  _undrawToBlank(onComplete) {
    if (this.state.currentShapeIndex === 0 || !this.state.currentPlayer) {
      onComplete();
      return;
    }
    const player = this.state.currentPlayer;
    const fromIndex = this.state.currentShapeIndex;
    const steps = fromIndex;
    if (steps === 0) {
      onComplete();
      return;
    }
    const delayPerStep = this.undrawDuration / steps;
    const isThinkingMode = this.state.mode === "thinking";
    if (isThinkingMode) {
      this._setupSigilAlphaContext();
    } else {
      this._setupGlyphgenContext();
    }
    for (let end = fromIndex - 1; end >= 0; end--) {
      const step = fromIndex - end;
      const timeoutId = setTimeout(() => {
        if (isThinkingMode) {
          this._setupSigilAlphaContext();
        } else {
          this._setupGlyphgenContext();
        }
        player.drawWindow(this.ctx, 0, end);
        this.state.currentShapeIndex = end;
        this.ctx.restore();
        if (end === 0) {
          onComplete();
        }
      }, step * delayPerStep);
      this.state.activeTimeouts.push(timeoutId);
    }
    this.ctx.restore();
  }
  /**
   * Generate a SigilAlpha sigil with given seed
   * @private
   * @param {number} seed - Random seed
   * @returns {Object} Player instance
   */
  _generateSigilAlpha(seed) {
    this._setupSigilAlphaContext();
    const player = createPlayer(this.ctx);
    compose(player.ctx, seed, this.sigilAlphaCoordSize);
    const originalDrawWindow = player.drawWindow;
    const self = this;
    player.drawWindow = function(targetCtx, start, end) {
      targetCtx.save();
      targetCtx.setTransform(self.dpr, 0, 0, self.dpr, 0, 0);
      targetCtx.clearRect(0, 0, self.logicalWidth, self.logicalHeight);
      targetCtx.restore();
      targetCtx.strokeStyle = self.lineColor;
      targetCtx.fillStyle = self.lineColor;
      targetCtx.lineWidth = self.lineWeight;
      targetCtx.lineCap = "round";
      targetCtx.lineJoin = "round";
      for (let i = start; i < end && i < this.shapes.length; i++) {
        const shape = this.shapes[i];
        shape.forEach((call) => {
          if (call.method) {
            targetCtx[call.method](...call.args);
          } else if (call.property) {
            if (call.property === "lineWidth") {
              targetCtx.lineWidth = self.lineWeight;
            } else if (call.property === "strokeStyle" || call.property === "fillStyle") {
              targetCtx[call.property] = self.lineColor;
            } else {
              targetCtx[call.property] = call.value;
            }
          }
        });
      }
    };
    player.finalize();
    this.ctx.restore();
    return player;
  }
  /**
   * Parse glyphgen calls and create player
   * @private
   * @param {string} calls - Raw JavaScript canvas draw calls
   * @returns {Object} Player instance
   */
  _parseAndCreateGlyphgen(calls) {
    const shapes = parseGlyphgenCalls(calls);
    const player = createPlayerFromShapes(shapes);
    const self = this;
    const originalDrawWindow = player.drawWindow;
    player.drawWindow = function(targetCtx, start, end) {
      targetCtx.save();
      targetCtx.setTransform(self.dpr, 0, 0, self.dpr, 0, 0);
      targetCtx.clearRect(0, 0, self.logicalWidth, self.logicalHeight);
      targetCtx.restore();
      targetCtx.strokeStyle = self.lineColor;
      targetCtx.fillStyle = self.lineColor;
      targetCtx.lineWidth = self.lineWeight;
      targetCtx.lineCap = "round";
      targetCtx.lineJoin = "round";
      for (let i = start; i < end && i < this.shapes.length; i++) {
        const shape = this.shapes[i];
        shape.forEach((call) => {
          if (call.method) {
            targetCtx[call.method](...call.args);
          } else if (call.property) {
            if (call.property === "strokeStyle" || call.property === "fillStyle") {
              targetCtx[call.property] = self.lineColor;
            } else if (call.property === "lineWidth") {
              targetCtx.lineWidth = self.lineWeight;
            } else {
              targetCtx[call.property] = call.value;
            }
          }
        });
      }
    };
    return player;
  }
  /**
   * Draw player progressively from 0 to end
   * @private
   * @param {Object} player - Player instance
   * @param {boolean} isThinkingMode - Whether we're in thinking mode
   * @param {Function} onComplete - Called when drawing completes
   */
  _drawProgressive(player, isThinkingMode, onComplete) {
    const steps = player.shapes.length;
    if (steps === 0) {
      onComplete();
      return;
    }
    const delayPerStep = this.drawDuration / steps;
    for (let end = 0; end <= steps; end++) {
      const timeoutId = setTimeout(() => {
        if (isThinkingMode) {
          this._setupSigilAlphaContext();
        } else {
          this._setupGlyphgenContext();
        }
        player.drawWindow(this.ctx, 0, end);
        this.state.currentShapeIndex = end;
        this.ctx.restore();
        if (end === steps) {
          onComplete();
        }
      }, end * delayPerStep);
      this.state.activeTimeouts.push(timeoutId);
    }
  }
  /**
   * Start thinking mode seed shifting
   * @private
   */
  _startThinkingShift() {
    this.state.thinkingIntervalId = setInterval(() => {
      if (this.state.mode !== "thinking") {
        this._stopThinkingShift();
        return;
      }
      this.state.thinkingSeed += 9999;
      const player = this._generateSigilAlpha(this.state.thinkingSeed);
      this.state.currentPlayer = player;
      this.state.maxShapes = player.shapes.length;
      this.state.currentShapeIndex = player.shapes.length;
      this._setupSigilAlphaContext();
      player.drawWindow(this.ctx, 0, player.shapes.length);
      this.ctx.restore();
    }, this.thinkingShiftInterval);
  }
  /**
   * Stop thinking mode seed shifting
   * @private
   */
  _stopThinkingShift() {
    if (this.state.thinkingIntervalId !== null) {
      clearInterval(this.state.thinkingIntervalId);
      this.state.thinkingIntervalId = null;
    }
  }
  /**
   * Start thinking mode - generates and displays SigilAlpha sigils with seed shifting
   * 
   * @example
   * sigil.thinking();  // Starts thinking mode
   * // Later...
   * sigil.thinking();  // Restarts with new seed
   */
  thinking() {
    this._cancelAllAnimations();
    this._stopThinkingShift();
    this._undrawToBlank(() => {
      this.state.thinkingSeed = Math.floor(Math.random() * 1e9);
      const player = this._generateSigilAlpha(this.state.thinkingSeed);
      this.state.mode = "thinking";
      this.state.currentPlayer = player;
      this.state.maxShapes = player.shapes.length;
      this.state.currentShapeIndex = 0;
      this.state.isAnimating = true;
      this._drawProgressive(player, true, () => {
        this.state.isAnimating = false;
        if (this.state.mode === "thinking") {
          this._startThinkingShift();
        }
      });
    });
  }
  /**
   * Start varied thinking mode - cycles through different thinking animations with random pauses
   * 
   * @example
   * sigil.thinkingVaried();  // Starts varied thinking mode
   * // Automatically generates new thinking animations with random pauses
   */
  thinkingVaried() {
    this.state.isThinkingVaried = true;
    this.thinking();
    const delay = this.thinkingVariedMin + Math.random() * (this.thinkingVariedMax - this.thinkingVariedMin);
    this.state.thinkingVariedTimeoutId = setTimeout(() => {
      if (this.state.isThinkingVaried) {
        this.thinkingVaried();
      }
    }, delay);
  }
  /**
   * Clear the current sigil and return to idle state
   * Undraws the current sigil (if any) and stops all animations/thinking modes.
   * After clearing, the Sigil is ready for new commands.
   * 
   * @param {boolean} [instant=false] - If true, clears instantly without undraw animation
   * 
   * @example
   * sigil.clear();           // Animated undraw, then clear
   * sigil.clear(false);      // Same as above
   * sigil.clear(true);       // Instant clear, no animation
   */
  clear(instant = false) {
    this.state.isThinkingVaried = false;
    this._cancelAllAnimations();
    this._stopThinkingShift();
    if (instant) {
      this._clearCanvas();
      this.state.mode = "idle";
      this.state.currentPlayer = null;
      this.state.currentShapeIndex = 0;
      this.state.maxShapes = 0;
      this.state.isAnimating = false;
      this.state.thinkingSeed = null;
    } else {
      this._undrawToBlank(() => {
        this.state.mode = "idle";
        this.state.currentPlayer = null;
        this.state.currentShapeIndex = 0;
        this.state.maxShapes = 0;
        this.state.isAnimating = false;
        this.state.thinkingSeed = null;
      });
    }
  }
  /**
   * Draw a specific sigil from glyphgen draw calls
   * 
   * @param {Object} options - Draw options
   * @param {string} options.calls - Raw JavaScript canvas draw calls
   * 
   * @example
   * sigil.drawSigil({
   *   calls: "```javascript\nctx.beginPath();\nctx.moveTo(50, 20);\n..."
   * });
   */
  drawSigil(options) {
    if (!options || !options.calls) {
      throw new Error("Sigil.drawSigil: calls string is required");
    }
    this.state.isThinkingVaried = false;
    this._cancelAllAnimations();
    this._stopThinkingShift();
    this._undrawToBlank(() => {
      const player = this._parseAndCreateGlyphgen(options.calls);
      this.state.mode = "drawing";
      this.state.currentPlayer = player;
      this.state.maxShapes = player.shapes.length;
      this.state.currentShapeIndex = 0;
      this.state.isAnimating = true;
      this._drawProgressive(player, false, () => {
        this.state.isAnimating = false;
      });
    });
  }
};
export {
  Sigil
};
//# sourceMappingURL=sigil.standalone.js.map
