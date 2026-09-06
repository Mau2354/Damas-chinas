(function () {
  const TAMANO = CheckersEngine.SIZE;
  const COLOR_HUMANO = 'red';
  const COLOR_BOT = 'black';

  const CLAVE_ESTILO = 'damas_estilo_fichas';
  const CLAVE_TEMA = 'damas_tema';

  const inputImagenRoja = document.getElementById('inputImagenRoja');
  const inputImagenNegra = document.getElementById('inputImagenNegra');
  const elAvisoImagen = document.getElementById('avisoImagen');

  const BOTS = [
    { nombre: 'Faust', avatar: 'img/bots/Faust.jpg' },
    { nombre: 'Mini', avatar: 'img/bots/MiniFaust.png'},
    { nombre: 'Slayer', avatar: 'img/bots/Slayer.jpg' },
    { nombre: 'Kirby', avatar: 'img/bots/Kirby.png' },
    { nombre: 'Fog', avatar: 'img/bots/Fog.jpg' },
    { nombre: 'Sardi', avatar: 'img/bots/Sardi.jpg' },
    { nombre: 'Mago', avatar: 'img/bots/Mago.jpg' },
    { nombre: 'Hachi', avatar: 'img/bots/Hachi.jpg' } 
  ];

  //los nombre en id no son iguales pq los nombres de los temas 
  const TEMAS = [
    { id: 'cafe', nombre: 'Amaderado', archivo: 'css/tema-madera.css' },
    { id: 'verde', nombre: 'Esmeralda', archivo: 'css/tema-esmeralda.css' },
    { id: 'celeste', nombre: 'Glaciares', archivo: 'css/tema-glaciar.css' },
  ];

  const elTablero = document.getElementById('tablero');
  const elTextoTurno = document.getElementById('textoTurno');
  const elPuntoTurno = document.getElementById('puntoTurno');
  const elAvatarTurno = document.getElementById('avatarTurno');
  const elBannerGanador = document.getElementById('bannerGanador');
  const elRielRojas = document.getElementById('rielRojas');
  const elRielNegras = document.getElementById('rielNegras');
  const elEnfrentamiento = document.getElementById('enfrentamiento');
  const botonNuevaPartida = document.getElementById('botonNuevaPartida');
  const elPensando = document.getElementById('pensando');
  const selectorEstiloFichas = document.getElementById('selectorEstiloFichas');
  const botonTema = document.getElementById('botonTema');
  const elVinculoTema = document.getElementById('temaVinculo');

  const modal = document.getElementById('modalConfiguracion');
  const modalModo = document.getElementById('modalModo');
  const modalNombreRojo = document.getElementById('modalNombreRojo');
  const modalNombreNegro = document.getElementById('modalNombreNegro');
  const campoNombreNegro = document.getElementById('campoNombreNegro');
  const campoDificultad = document.getElementById('campoDificultad');
  const modalDificultad = document.getElementById('modalDificultad');
  const infoBot = document.getElementById('infoBot');
  const modalAvatarBot = document.getElementById('modalAvatarBot');
  const modalNombreBotTexto = document.getElementById('modalNombreBotTexto');
  const botonRerollBot = document.getElementById('botonRerollBot');
  const botonComenzar = document.getElementById('botonComenzar');

  let tablero, jugadorActual, casillaSeleccionada, movimientosLegalesSeleccion, juegoTerminado, ultimoMovimiento;
  let movimientoBotEnCurso = false;
  let modoVersus = false;
  let dificultadActual = 3;
  let nombreRojo = 'Rojas';
  let nombreNegro = 'Negras';
  let avatarBot = '';
  let botPrevisualizado = BOTS[0];
  let indiceTema = 0;


  function aplicarTema(indice, guardar) {
    indiceTema = ((indice % TEMAS.length) + TEMAS.length) % TEMAS.length;
    const tema = TEMAS[indiceTema];
    elVinculoTema.setAttribute('href', tema.archivo);
    botonTema.textContent = 'Tabla ' + tema.nombre;
    if (guardar) {
      try { localStorage.setItem(CLAVE_TEMA, tema.id); } catch (e) { /*localstorage no disponible */ }
    }
  }

  function inicializarTemaYEstilo() {
    let estiloGuardado = 'gradiente';
    let temaGuardadoId = null;
    try {
      estiloGuardado = localStorage.getItem(CLAVE_ESTILO) || 'gradiente';
      temaGuardadoId = localStorage.getItem(CLAVE_TEMA);
    } catch (e) { /*localstorage no disponible */ }

    document.body.dataset.piezas = estiloGuardado;
    if (selectorEstiloFichas) selectorEstiloFichas.value = estiloGuardado;

    let idx = 0;
    if (temaGuardadoId) {
      const encontrado = TEMAS.findIndex(t => t.id === temaGuardadoId);
      if (encontrado >= 0) idx = encontrado;
    }
    aplicarTema(idx, false);
  }

  let estiloAnterior = document.body.dataset.piezas || 'gradiente';

  if (selectorEstiloFichas) {
    selectorEstiloFichas.addEventListener('change', () => {
      const nuevoValor = selectorEstiloFichas.value;
      document.body.dataset.piezas = nuevoValor;
      try { localStorage.setItem(CLAVE_ESTILO, nuevoValor); } catch (e) { /* ignorar */ }

      if (nuevoValor === 'figuras' && estiloAnterior !== 'figuras') {
        pedirImagenesDeFiguras();
      }
      estiloAnterior = nuevoValor;
    });
  }

  if (botonTema) {
    botonTema.addEventListener('click', () => aplicarTema(indiceTema + 1, true));
  }


  function elegirBotAleatorio() {
    return BOTS[Math.floor(Math.random() * BOTS.length)];
  }

  function previsualizarBot() {
    botPrevisualizado = elegirBotAleatorio();
    modalAvatarBot.innerHTML = '<img src="' + botPrevisualizado.avatar + '" alt="' + botPrevisualizado.nombre + '">';
    modalNombreBotTexto.textContent = botPrevisualizado.nombre;
  }

  function aplicarImagenFicha(color, dataUrl) {
    const variable = color === 'roja' ? '--imagen-ficha-roja' : '--imagen-ficha-negra';
    const clase = color === 'roja' ? 'imagen-roja' : 'imagen-negra';
    document.body.style.setProperty(variable, 'url("' + dataUrl + '")');
    document.body.classList.add(clase);
    dibujar();
  }

  function quitarImagenFicha(color) {
    const variable = color === 'roja' ? '--imagen-ficha-roja' : '--imagen-ficha-negra';
    const clase = color === 'roja' ? 'imagen-roja' : 'imagen-negra';
    document.body.style.removeProperty(variable);
    document.body.classList.remove(clase);
  }

  function manejarSubidaImagen(archivo, color) {
    if (!archivo || !archivo.type.startsWith('image/')) return;
    const lector = new FileReader();
    lector.onload = () => aplicarImagenFicha(color, lector.result);
    lector.readAsDataURL(archivo);
  }

  function mostrarAviso(texto) {
    if (!elAvisoImagen) return;
    elAvisoImagen.textContent = texto;
    elAvisoImagen.classList.remove('oculto');
  }

  function ocultarAviso() {
    if (!elAvisoImagen) return;
    elAvisoImagen.classList.add('oculto');
  }

  // Pide primero la imagen roja; al terminar, pide la negra (con un aviso previo antes de cada selector)
  function pedirImagenesDeFiguras() {
    quitarImagenFicha('roja');
    quitarImagenFicha('negra');
    if (!inputImagenRoja) return;
    inputImagenRoja.value = '';
    mostrarAviso('Elige una imagen para las fichas rojas...');
    setTimeout(() => {
      ocultarAviso();
      inputImagenRoja.click();
    }, 1200);
  }

  if (inputImagenRoja) {
    inputImagenRoja.addEventListener('change', () => {
      if (inputImagenRoja.files[0]) manejarSubidaImagen(inputImagenRoja.files[0], 'roja');
      if (inputImagenNegra) {
        inputImagenNegra.value = '';
        mostrarAviso('Elige una imagen para las fichas negras...');
        setTimeout(() => {
          ocultarAviso();
          inputImagenNegra.click();
        }, 1200);
      }
    });
  }
  if (inputImagenNegra) {
    inputImagenNegra.addEventListener('change', () => {
      if (inputImagenNegra.files[0]) manejarSubidaImagen(inputImagenNegra.files[0], 'negra');
    });
  }

  function actualizarCamposModal() {
    const esBot = modalModo.value === 'bot';
    campoNombreNegro.style.display = esBot ? 'none' : '';
    campoDificultad.style.display = esBot ? '' : 'none';
    infoBot.style.display = esBot ? 'flex' : 'none';
    if (esBot) previsualizarBot();
  }

  function abrirModalConfiguracion() {
    modal.classList.remove('oculto');
    actualizarCamposModal();
    modalNombreRojo.focus();
  }

  function cerrarModalConfiguracion() {
    modal.classList.add('oculto');
  }

  modalModo.addEventListener('change', actualizarCamposModal);
  if (botonRerollBot) botonRerollBot.addEventListener('click', previsualizarBot);

  botonComenzar.addEventListener('click', () => {
    modoVersus = modalModo.value === 'versus';
    nombreRojo = (modalNombreRojo.value || '').trim() || (modoVersus ? 'Jugador 1' : 'Jugador');

    if (modoVersus) {
      nombreNegro = (modalNombreNegro.value || '').trim() || 'Jugador 2';
      avatarBot = '';
    } else {
      nombreNegro = botPrevisualizado.nombre;
      avatarBot = botPrevisualizado.avatar;
      dificultadActual = parseInt(modalDificultad.value, 10) || 3;
    }

    cerrarModalConfiguracion();
    iniciarPartida();
  });


  function iniciarPartida() {
    tablero = CheckersEngine.createInitialBoard();
    jugadorActual = 'red';
    casillaSeleccionada = null;
    movimientosLegalesSeleccion = [];
    juegoTerminado = false;
    ultimoMovimiento = null;
    movimientoBotEnCurso = false;
    elPensando.classList.remove('activo');

    elBannerGanador.textContent = '';
    elRielRojas.innerHTML = '<div class="etiqueta-riel">Fichas rojas capturadas</div>';
    elRielNegras.innerHTML = '<div class="etiqueta-riel">Fichas negras capturadas</div>';

    elEnfrentamiento.innerHTML = nombreRojo + ' (Rojas) VS ' +
      nombreNegro + (avatarBot ? ' <img class="avatar-inline" src="' + avatarBot + '" alt="">' : '') + ' (Negras)';

    actualizarInterfazTurno();
    dibujar();

    if (selectorEstiloFichas && selectorEstiloFichas.value === 'figuras') {
      pedirImagenesDeFiguras();
    }
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
      elAvatarTurno.textContent = '';
      return;
    }
    const nombreActual = jugadorActual === 'red' ? nombreRojo : nombreNegro;
    elTextoTurno.textContent = 'Turno de ' + nombreActual;
    elAvatarTurno.innerHTML = (!modoVersus && jugadorActual === COLOR_BOT && avatarBot)
      ? '<img src="' + avatarBot + '" alt="' + nombreNegro + '">'
      : '';
    elPuntoTurno.className = 'punto-turno ' + jugadorActual;
  }

  function verificarFinDePartida() {
    if (!CheckersEngine.hasAnyMoves(tablero, jugadorActual)) {
      juegoTerminado = true;
      const ganador = CheckersEngine.opponent(jugadorActual);
      const nombreGanador = ganador === 'red' ? nombreRojo : nombreNegro;
      const nombrePerdedor = jugadorActual === 'red' ? nombreRojo : nombreNegro;
      elBannerGanador.textContent =
        '¡Gana ' + nombreGanador + '! \u2014 sin movimientos para ' + nombrePerdedor;
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
    const profundidad = dificultadActual || 3;
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

  botonNuevaPartida.addEventListener('click', abrirModalConfiguracion);

  inicializarTemaYEstilo();
  abrirModalConfiguracion();
})();
