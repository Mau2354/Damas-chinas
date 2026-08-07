(function () {
  const TAMANO = CheckersEngine.SIZE;
  const COLOR_HUMANO = 'red';
  const COLOR_BOT = 'black';

  const elTablero = document.getElementById('tablero');
  const elTextoTurno = document.getElementById('textoTurno');
  const elPuntoTurno = document.getElementById('puntoTurno');
  const elBannerGanador = document.getElementById('bannerGanador');
  const elRielRojas = document.getElementById('rielRojas');
  const elRielNegras = document.getElementById('rielNegras');
  const botonNuevaPartida = document.getElementById('botonNuevaPartida');
  const elPensando = document.getElementById('pensando');
  const selectorDificultad = document.getElementById('selectorDificultad');
  const selectorModo = document.getElementById('selectorModo');

  let tablero, jugadorActual, casillaSeleccionada, movimientosLegalesSeleccion, juegoTerminado, ultimoMovimiento;
  let movimientoBotEnCurso = false;
  let modoVersus = false;

  function actualizarVisibilidadDificultad() {
    if (!selectorDificultad) return;
    selectorDificultad.style.display = modoVersus ? 'none' : '';
  }

  function iniciarPartida() {
    if (selectorModo) modoVersus = selectorModo.value === 'versus';
    actualizarVisibilidadDificultad();

    tablero = CheckersEngine.createInitialBoard();
    jugadorActual = 'red';
    casillaSeleccionada = null;
    movimientosLegalesSeleccion = [];
    juegoTerminado = false;
    ultimoMovimiento = null;
    movimientoBotEnCurso = false;
    elPensando.classList.remove('activo');

    elBannerGanador.textContent = '';
    elRielRojas.innerHTML = '<div class="etiqueta-riel">Rojas capturadas</div>';
    elRielNegras.innerHTML = '<div class="etiqueta-riel">Negras capturadas</div>';

    actualizarInterfazTurno();
    dibujar();
  }

  function agregarAlRiel(color) {
    const riel = color === 'red' ? elRielRojas : elRielNegras;
    const punto = document.createElement('div');
    punto.className = 'ficha-capturada ' + color;
    riel.appendChild(punto);
  }

  function actualizarInterfazTurno() {
    if (juegoTerminado) {
      elTextoTurno.textContent = 'Partida terminada';
      return;
    }
    if (modoVersus) {
      elTextoTurno.textContent = 'Turno de ' + (jugadorActual === 'red' ? 'Rojas' : 'Negras');
    } else {
      elTextoTurno.textContent = (jugadorActual === COLOR_HUMANO ? 'Tu turno' : 'Turno del bot');
    }
    elPuntoTurno.className = 'punto-turno ' + jugadorActual;
  }

  function verificarFinDePartida() {
    if (!CheckersEngine.hasAnyMoves(tablero, jugadorActual)) {
      juegoTerminado = true;
      const ganador = CheckersEngine.opponent(jugadorActual);
      const textoGanador = modoVersus
        ? (ganador === 'red' ? 'Ganan Rojas' : 'Ganan Negras')
        : (ganador === COLOR_HUMANO ? 'Ganaste' : 'Gana el bot');
      elBannerGanador.textContent =
        textoGanador + ' \u2014 sin movimientos para ' +
        (jugadorActual === 'red' ? 'Rojas' : 'Negras');
      return true;
    }
    return false;
  }

  function aplicarPaso(movimiento) {
    const info = CheckersEngine.applyMove(tablero, movimiento);
    if (info.capturedPiece) agregarAlRiel(info.capturedPiece.color);
    ultimoMovimiento = { from: movimiento.from, to: movimiento.to };
    return info.furtherCaptures;
  }

  function terminarTurno() {
    casillaSeleccionada = null;
    movimientosLegalesSeleccion = [];
    jugadorActual = CheckersEngine.opponent(jugadorActual);
    actualizarInterfazTurno();

    if (verificarFinDePartida()) {
      dibujar();
      return;
    }

    dibujar();

    if (!modoVersus && jugadorActual === COLOR_BOT) {
      programarMovimientoBot();
    }
  }

  function programarMovimientoBot() {
    movimientoBotEnCurso = true;
    elPensando.classList.add('activo');
    setTimeout(ejecutarMovimientoBot, 450);
  }

  function ejecutarMovimientoBot() {
    const profundidad = parseInt(selectorDificultad.value, 10) || 3;
    const secuencia = CheckersEngine.findBestMove(tablero, COLOR_BOT, profundidad);
    elPensando.classList.remove('activo');
    movimientoBotEnCurso = false;

    if (!secuencia) {
      verificarFinDePartida();
      dibujar();
      return;
    }

    let i = 0;
    function jugarSiguientePaso() {
      const paso = secuencia[i];
      aplicarPaso(paso);
      i++;
      dibujar();
      if (i < secuencia.length) {
        setTimeout(jugarSiguientePaso, 280);
      } else {
        jugadorActual = CheckersEngine.opponent(jugadorActual);
        actualizarInterfazTurno();
        verificarFinDePartida();
        dibujar();
      }
    }
    jugarSiguientePaso();
  }

  function alHacerClicEnCasilla(fila, columna) {
    if (juegoTerminado || movimientoBotEnCurso) return;
    if (!modoVersus && jugadorActual !== COLOR_HUMANO) return;
    const ficha = tablero[fila][columna];

    if (casillaSeleccionada) {
      const movimiento = movimientosLegalesSeleccion.find(m => m.to[0] === fila && m.to[1] === columna);
      if (movimiento) {
        const capturasSiguientes = aplicarPaso(movimiento);
        if (movimiento.captured && capturasSiguientes.length > 0) {
          casillaSeleccionada = [fila, columna];
          movimientosLegalesSeleccion = capturasSiguientes;
          dibujar();
          return;
        }
        terminarTurno();
        return;
      }
    }

    if (ficha && ficha.color === jugadorActual) {
      const movimientos = CheckersEngine.movesForPiece(tablero, fila, columna, jugadorActual);
      if (movimientos.length > 0) {
        casillaSeleccionada = [fila, columna];
        movimientosLegalesSeleccion = movimientos;
        dibujar();
        return;
      }
    }

    casillaSeleccionada = null;
    movimientosLegalesSeleccion = [];
    dibujar();
  }

  function dibujar() {
    elTablero.innerHTML = '';
    const capturasForzadas = CheckersEngine.allCapturesForColor(tablero, jugadorActual);
    const posicionesForzadas = new Set(capturasForzadas.map(f => f.pos[0] + ',' + f.pos[1]));

    for (let fila = 0; fila < TAMANO; fila++) {
      for (let columna = 0; columna < TAMANO; columna++) {
        const elCasilla = document.createElement('div');
        const esOscura = (fila + columna) % 2 === 1;
        elCasilla.className = 'casilla ' + (esOscura ? 'oscura' : 'clara');

        if (ultimoMovimiento && (
          (ultimoMovimiento.from[0] === fila && ultimoMovimiento.from[1] === columna) ||
          (ultimoMovimiento.to[0] === fila && ultimoMovimiento.to[1] === columna)
        )) {
          elCasilla.classList.add('ultimo-movimiento');
        }

        if (casillaSeleccionada && casillaSeleccionada[0] === fila && casillaSeleccionada[1] === columna) {
          elCasilla.classList.add('seleccionada');
        }

        if (casillaSeleccionada && movimientosLegalesSeleccion.some(m => m.to[0] === fila && m.to[1] === columna)) {
          elCasilla.classList.add('seleccionable');
        }

        const ficha = tablero[fila][columna];
        if (ficha) {
          const elFicha = document.createElement('div');
          elFicha.className = 'ficha ' + ficha.color + (ficha.king ? ' coronada' : '');
          const puedeMover = (modoVersus || ficha.color === COLOR_HUMANO) && ficha.color === jugadorActual &&
            !juegoTerminado && !movimientoBotEnCurso &&
            (posicionesForzadas.size > 0
              ? posicionesForzadas.has(fila + ',' + columna)
              : CheckersEngine.movesForPiece(tablero, fila, columna, jugadorActual).length > 0);
          if (puedeMover) elFicha.classList.add('resaltado-movible');
          elCasilla.appendChild(elFicha);
        }

        elCasilla.addEventListener('click', () => alHacerClicEnCasilla(fila, columna));
        elTablero.appendChild(elCasilla);
      }
    }
  }

  botonNuevaPartida.addEventListener('click', iniciarPartida);
  if (selectorModo) selectorModo.addEventListener('change', iniciarPartida);

  iniciarPartida();
})();
