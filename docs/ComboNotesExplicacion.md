

### Potencia

Notas que extraeremos: 

CPU: Potencia
GPU: Potencia
RAM: Velocidad y Latencia

###### Formula

Potencia = (CPU potencia x 0.4) + (GPU potencia x 0.45) + (RAM velocidad x 0.075) + (RAM latencia x 0.075) 

###### Ejemplo

**Cálculo paso a paso:**

- **Aporte CPU:** $3.6 \times 0.40 = 1.44 \text{ pts}$
    
- **Aporte GPU:** $5.1 \times 0.45 = 2.295 \text{ pts}$
    
- **Aporte RAM (Velocidad):** $4.1 \times 0.075 = 0.3075 \text{ pts}$
    
- **Aporte RAM (Latencia):** $6.3 \times 0.075 = 0.4725 \text{ pts}$
    

**Nota Final:**

$$1.44 + 2.295 + 0.3075 + 0.4725 = 4.515$$
### Productividad

Notas que extraeremos

CPU: Productividad
GPU: Productividad
RAM: Productividad

###### Formula

Productividad = (CPU productividad x 0.40) + (GPU productividad x 0.40) + (RAM productividad x 0.20) 

###### Ejemplo

**Cálculo paso a paso:**

- **Aporte CPU:** $3.3 \times 0.40 = 1.32 \text{ pts}$
    
- **Aporte GPU:** $4.0 \times 0.40 = 1.60 \text{ pts}$
    
- **Aporte RAM:** $3.0 \times 0.20 = 0.60 \text{ pts}$
    

**Nota Final:**

$$1.32 + 1.60 + 0.60 = 3.52$$

### Juegos/Gaming

CPU: Juegos
GPU: Juegos
RAM: Juegos

###### Formula

Juegos = (CPU juegos x 0.30) + (GPU juegos x 0.55) + (RAM juegos x 0.15) 

###### Ejemplo

**Cálculo paso a paso:**

- **Aporte GPU:** $5.2 \times 0.55 = 2.86 \text{ pts}$
    
- **Aporte CPU:** $5.6 \times 0.30 = 1.68 \text{ pts}$
    
- **Aporte RAM:** $4.7 \times 0.15 = 0.705 \text{ pts}$
    

**Nota Final:**

$$2.86 + 1.68 + 0.705 = 5.245$$

### Eficiencia

CPU: Eficiencia
GPU: Eficiencia

###### Formula

Eficiencia = (CPU juegos x 0.30) + (GPU juegos x 0.55)

**Cálculo paso a paso:**

- **Aporte GPU:** $7.5 \times 0.60 = 4.50 \text{ pts}$
    
- **Aporte CPU:** $5.6 \times 0.40 = 2.24 \text{ pts}$
    

**Nota Final:**

$$4.50 + 2.24 = 6.74$$

### Cuello de botella

CPU: Juegos
GPU: Juegos
RAM: Juegos

###### Formulas

$\Delta_{\text{CPU-GPU}} = \vert{}\text{Nota CPU} - \text{Nota GPU}\vert{}$
$\Delta_{\text{RAM}} = \vert{}\max(\text{Nota CPU}, \text{Nota GPU}) - \text{Nota RAM}\vert{}$ _(Comparamos la RAM contra el componente más rápido del PC para ver si lo está frenando)_.

La fórmula de fricción base sería:

$$\text{Fricción} = (\Delta_{\text{CPU-GPU}} \times 0.75) + (\Delta_{\text{RAM}} \times 0.25)$$

Y para que las diferencias grandes castiguen la nota de verdad (nadie quiere un cuello de botella grave), le aplicamos un **Multiplicador de Gravedad de 1.2**:

$$\text{Equilibrio}_{Combo} = 10 - (\text{Fricción} \times 1.2)$$

###### Ejemplo

Vamos a pasar el Ryzen 5 5600X, la RTX 5070 y la RAM DDR4 por la trituradora:

**Paso A: Calcular las diferencias ($\Delta$)**

- $\Delta_{\text{CPU-GPU}} = \vert{}5.6 - 5.2\vert{} = 0.4$
    
- $\Delta_{\text{RAM}} = \vert{}\max(5.6, 5.2) - 4.7\vert{} = \vert{}5.6 - 4.7\vert{} = 0.9$
    

**Paso B: Calcular la Fricción ponderada**

- Choque CPU-GPU: $0.4 \times 0.75 = 0.30 \text{ pts}$
    
- Choque RAM: $0.9 \times 0.25 = 0.225 \text{ pts}$
    
- Fricción Total = $0.30 + 0.225 = 0.525$
    

**Paso C: Calcular la Nota de Equilibrio Final**

- $$\text{Nota Final} = 10 - (0.525 \times 1.2)$$
    
- 
$$\text{Nota Final} = 10 - 0.63 = 9.37$$


### Calidad precio

###### Formula

$$\text{Calidad/Precio}_{Combo} = \sum \left( \text{Nota}_{Comp} \times \frac{\text{Precio}_{Comp}}{\text{Precio}_{Total}} \right)$$

###### Ejemplo con tus Datos

Para ver cómo funciona esto en la realidad, vamos a asignarle a tu hardware unos precios MSRP de mercado simulados:

- **GPU (RTX 5070):** 600€ _(Nota C/P: 8.4)_
    
- **CPU (Ryzen 5 5600X):** 150€ _(Nota C/P: 2.4)_
    
- **RAM (DDR4):** 50€ _(Nota C/P: 7.0)_
    
- **Presupuesto Total = 800€**
    

**Paso A: Calcular el peso de cada componente en el presupuesto**

- **Peso GPU:** $600 / 800 = 0.75$ (Se lleva el 75% del presupuesto)
    
- **Peso CPU:** $150 / 800 = 0.1875$ (Se lleva el 18.75% del presupuesto)
    
- **Peso RAM:** $50 / 800 = 0.0625$ (Se lleva el 6.25% del presupuesto)
    

**Paso B: Aplicar los pesos a tus notas de Calidad/Precio**

- **Aporte GPU:** $8.4 \times 0.75 = 6.30 \text{ pts}$
    
- **Aporte CPU:** $2.4 \times 0.1875 = 0.45 \text{ pts}$
    
- **Aporte RAM:** $7.0 \times 0.0625 = 0.4375 \text{ pts}$
    

**Nota Final:**

$$6.30 + 0.45 + 0.4375 = 7.1875$$
## Notas individuales de ejemplo

###### RAM DDR4

Potencia 4.1
Tecnologias 6.0
Latencia 6.3
Juegos 4.7
Productividad 3.0
Calidad precio 7.0(variable)

###### RTX 5070

Potencia 5.1
Tecnologias 9.8
Productividad 4.0
Juegos 5.2
Eficiencia 7.5
Calidad precio 8.4(variable)

###### R5 5600X

Potencia 3.6
Tecnologias 4.5
Productividad 3.3
Juegos 5.6
Eficiencia 5.6
Calidad precio 2.4(variable)

Debemos tener en cuenta que la calidad precio es variable porque depende del precio que le asigne al usuario, actualmente las notas estan con el msrp
