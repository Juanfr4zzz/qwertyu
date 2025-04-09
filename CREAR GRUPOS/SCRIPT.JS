document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const showListBtn = document.getElementById('showListBtn');
    const formGroupsBtn = document.getElementById('formGroupsBtn');
    const studentListUl = document.getElementById('studentListUl');
    const groupsContainer = document.getElementById('groupsContainer');
    const numGruposInput = document.getElementById('numGrupos');
    const numMujeresInput = document.getElementById('numMujeres');
    const numHombresInput = document.getElementById('numHombres');
    const fileInfo = document.getElementById('fileInfo');
    const errorMessage = document.getElementById('error-message');

    let alumnos = [];
    let archivoCargado = false;

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];

        if (!file) {
            fileInfo.textContent = 'Ningún archivo seleccionado.';
            showListBtn.disabled = true;
            formGroupsBtn.disabled = true;
            archivoCargado = false;
            return;
        }

        fileInfo.textContent = `Archivo seleccionado: ${file.name}`;

        try {
            alumnos = await procesarArchivo(file);
            showListBtn.disabled = false;
            formGroupsBtn.disabled = false;
            archivoCargado = true;
            errorMessage.textContent = ''; // Limpiar mensaje de error
        } catch (error) {
            console.error("Error al procesar el archivo:", error);
            errorMessage.textContent = 'Error al procesar el archivo. Verifique el formato.';
            showListBtn.disabled = true;
            formGroupsBtn.disabled = true;
            archivoCargado = false;
            alumnos = []; // Limpiar los datos
        }
    });

    showListBtn.addEventListener('click', () => {
        if (!archivoCargado) {
            alert('Por favor, cargue un archivo primero.');
            return;
        }
        mostrarListaAlumnos(alumnos);
    });

    formGroupsBtn.addEventListener('click', () => {
        if (!archivoCargado) {
            alert('Por favor, cargue un archivo primero.');
            return;
        }
        const numGrupos = parseInt(numGruposInput.value, 10);
        const numMujeres = parseInt(numMujeresInput.value, 10);
        const numHombres = parseInt(numHombresInput.value, 10);

        if (isNaN(numGrupos) || numGrupos <= 0) {
            alert('Por favor, ingrese un número válido de grupos.');
            return;
        }

        if (isNaN(numMujeres) || isNaN(numHombres) || numMujeres < 0 || numHombres < 0) {
            alert('Por favor, ingrese un número válido de mujeres y hombres por grupo.');
            return;
        }

        formarGrupos(alumnos, numGrupos, numMujeres, numHombres);
    });

    function procesarArchivo(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    let alumnos = XLSX.utils.sheet_to_json(sheet);

                    // Adaptar los nombres de las propiedades
                    alumnos = alumnos.map(alumno => ({
                        apellidosNombres: alumno['ApellidosNombres'],
                        genero: alumno['Genero']
                    }));
                    resolve(alumnos);
                } catch (error) {
                    console.error("Error al procesar el archivo:", error);
                    reject(error);
                }
            };

            reader.onerror = (error) => {
                reject(error);
            };

            reader.readAsBinaryString(file);
        });
    }


    function mostrarListaAlumnos(alumnos) {
        studentListUl.innerHTML = '';
        const alumnosOrdenados = [...alumnos].sort((a, b) =>
            a.apellidosNombres.localeCompare(b.apellidosNombres)
        );

        alumnosOrdenados.forEach(alumno => {
            const li = document.createElement('li');
            li.textContent = `${alumno.apellidosNombres} (${alumno.genero})`;
            studentListUl.appendChild(li);
        });
    }


    function formarGrupos(alumnos, numGrupos, numMujeresPorGrupo, numHombresPorGrupo) {
        // Validación adicional para asegurar que haya suficientes alumnos
        const totalAlumnosNecesarios = numGrupos * (numMujeresPorGrupo + numHombresPorGrupo);
        if (alumnos.length < totalAlumnosNecesarios) {
            alert('No hay suficientes alumnos para formar los grupos con la configuración especificada.');
            return;
        }

        let mujeres = alumnos.filter(alumno => alumno.genero.toUpperCase() === 'F');
        let hombres = alumnos.filter(alumno => alumno.genero.toUpperCase() === 'M');

        const grupos = [];
        const alumnosAsignados = new Set(); // Para evitar nombres repetidos

        for (let i = 0; i < numGrupos; i++) {
            const grupo = {
                id: i + 1,
                integrantes: []
            };

            // Agregar mujeres al grupo
            let mujeresAgregadas = 0;
            while (mujeresAgregadas < numMujeresPorGrupo && mujeres.length > 0) {
                const indiceMujer = Math.floor(Math.random() * mujeres.length);
                const posibleMujer = mujeres[indiceMujer];

                if (!alumnosAsignados.has(posibleMujer.apellidosNombres)) {
                    grupo.integrantes.push(posibleMujer);
                    alumnosAsignados.add(posibleMujer.apellidosNombres);
                    mujeres.splice(indiceMujer, 1); // Eliminar la mujer asignada de la lista
                    mujeresAgregadas++;
                } else {
                    mujeres.splice(indiceMujer, 1); // Eliminar la mujer repetida de la lista
                }
            }

            // Agregar hombres al grupo
            let hombresAgregados = 0;
            while (hombresAgregados < numHombresPorGrupo && hombres.length > 0) {
                const indiceHombre = Math.floor(Math.random() * hombres.length);
                const posibleHombre = hombres[indiceHombre];

                if (!alumnosAsignados.has(posibleHombre.apellidosNombres)) {
                    grupo.integrantes.push(posibleHombre);
                    alumnosAsignados.add(posibleHombre.apellidosNombres);
                    hombres.splice(indiceHombre, 1); // Eliminar el hombre asignado de la lista
                    hombresAgregados++;
                } else {
                    hombres.splice(indiceHombre, 1); // Eliminar el hombre repetido de la lista
                }
            }

            grupos.push(grupo);
        }

        mostrarGrupos(grupos);
    }



    function mostrarGrupos(grupos) {
        groupsContainer.innerHTML = '';

        grupos.forEach(grupo => {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('group');

            const h3 = document.createElement('h3');
            h3.textContent = `Grupo ${grupo.id}`;
            groupDiv.appendChild(h3);

            const ul = document.createElement('ul');
            grupo.integrantes.forEach(integrante => {
                const li = document.createElement('li');
                li.textContent = `${integrante.apellidosNombres} (${integrante.genero})`;
                ul.appendChild(li);
            });
            groupDiv.appendChild(ul);

            groupsContainer.appendChild(groupDiv);
        });
    }
});