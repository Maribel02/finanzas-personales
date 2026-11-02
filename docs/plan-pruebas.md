# Plan de pruebas funcionales — Mi Balance

## Objetivo

Verificar que las funciones centrales de la aplicación de gestión de gastos personales respondan a los requisitos del proyecto. Completar la columna de resultado únicamente después de ejecutar cada prueba.

| ID | Caso de prueba | Pasos | Resultado esperado | Resultado observado |
|---|---|---|---|---|
| PF-01 | Registrar un gasto válido | Crear un gasto con descripción, categoría, valor y fecha válidos | El gasto aparece en movimientos y afecta el resumen del mes | Pendiente de ejecución |
| PF-02 | Registrar un ingreso válido | Crear un ingreso válido | El ingreso aparece y aumenta los ingresos del período | Pendiente de ejecución |
| PF-03 | Validar valor cero o negativo | Intentar guardar un movimiento con valor 0 o negativo | El registro no se guarda y se muestra una validación | Pendiente de ejecución |
| PF-04 | Validar descripción vacía | Intentar guardar sin descripción | El formulario impide el registro | Pendiente de ejecución |
| PF-05 | Editar movimiento | Cambiar descripción o valor de un movimiento | Se actualiza el registro y los totales | Pendiente de ejecución |
| PF-06 | Eliminar movimiento | Eliminar y confirmar un registro | El movimiento desaparece y los totales se recalculan | Pendiente de ejecución |
| PF-07 | Filtrar por mes | Seleccionar otro mes | Se muestran los registros y totales del mes seleccionado | Pendiente de ejecución |
| PF-08 | Buscar movimiento | Escribir parte de una descripción | La tabla se filtra según el texto | Pendiente de ejecución |
| PF-09 | Filtrar por tipo/categoría | Seleccionar ingreso, gasto o categoría | La tabla muestra coincidencias | Pendiente de ejecución |
| PF-10 | Crear presupuesto | Definir un límite válido para una categoría | Se crea el presupuesto y aparece el avance | Pendiente de ejecución |
| PF-11 | Superar presupuesto | Registrar gastos que superen el límite | Se indica el exceso y se destaca el progreso | Pendiente de ejecución |
| PF-12 | Exportar CSV | Pulsar exportar en movimientos | Se descarga un CSV con los registros filtrados | Pendiente de ejecución |
| PF-13 | Persistencia local | Guardar un movimiento y recargar la página | El registro permanece en el mismo navegador | Pendiente de ejecución |
| PF-14 | Diseño adaptable | Abrir la aplicación en ventana móvil | Menú y formularios se pueden usar sin desbordamiento general | Pendiente de ejecución |
| PF-15 | Restaurar demo | Pulsar restaurar y confirmar | Se reemplazan los datos locales por los ejemplos | Pendiente de ejecución |

## Evidencia a conservar

Para cada caso, registrar fecha, navegador/versión, datos de entrada, resultado esperado, resultado observado, estado (aprobado/reprobado) y captura de pantalla si corresponde. No declarar pruebas aprobadas sin haberlas ejecutado.
