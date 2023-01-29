interface IData {
    name: string;
    settings: {
        minValue: number
        maxValue: number | null
        color: string
    },
    values?: ({
        id: number;
        name: string;
        type: "options" | "default";
        priceCalcOption?: {
            freeAmount: number;
        } | null;
        value?: (IValue)[] | null | number;
    })[] | null;
}

interface IValue {
    name: string;
    value: number;
}


const CHART_TOP_GAP = 40



document.addEventListener("DOMContentLoaded", () => { new CalcControler(DATA).start() })


class CalcControler {
    data: IData[]
    state: {
        ranges: { [key: string]: number },
        calcData: { name: string, value: number }[]
    }

    constructor(data: IData[]) {
        this.data = data
        this.state = {
            ranges: { storage: 0, transfer: 0 },
            calcData: data.map(e => ({ name: e.name, value: 0 }))
        }
    }

    start() {
        const render = this.render()

        render && document.querySelectorAll("input[type=range], input[type=radio]").forEach(elem => {
            const element = (elem as HTMLInputElement)
            this.eventHandler({ element })
            element.addEventListener("input", (e) => this.eventHandler({ element: (e.target as HTMLInputElement) }))
        })
    }

    setCalcData({ name, value }: { name: string, value: number }) {
        this.state.calcData = this.state.calcData.map(elem => {
            return elem.name === name
                ? ({ ...elem, value: Number(value.toFixed(2)) })
                : elem
        })
    }

    render() {
        const listElement = document.querySelector("#items ul")

        if (!listElement) return false

        for (let index = 0; index < this.data.length; index++) {

            const dataItem = this.data[index];
            const listItemElement = document.createElement("li")

            listItemElement.setAttribute("data-value", "0")
            listItemElement.setAttribute("data-name", dataItem.name)
            listItemElement.setAttribute("data-color", dataItem.settings.color)

            const contentElement = document.createElement("div")
            contentElement.innerText = dataItem.name

            if (dataItem.values) {
                for (let index = 0; index < dataItem.values.length; index++) {

                    const { type, value } = dataItem.values[index];

                    if (type === "options" && typeof value === "object") {

                        const radioGroup = document.createElement("div")

                        value?.forEach(({ name, value }, idx) => {

                            const wrapperElement = document.createElement("div")
                            const inputElement = document.createElement("input")
                            const inputLabelElement = document.createElement("label")

                            inputElement.type = "radio"
                            inputElement.id = name
                            inputElement.value = String(value)
                            inputElement.name = dataItem.name + "-radio"
                            inputElement.checked = idx === 0
                            inputLabelElement.htmlFor = name
                            inputLabelElement.innerText = name

                            wrapperElement.appendChild(inputElement)
                            wrapperElement.appendChild(inputLabelElement)
                            radioGroup.appendChild(wrapperElement)
                        })

                        contentElement.appendChild(radioGroup)
                    }
                }

            }

            listItemElement.appendChild(contentElement)
            listElement.appendChild(listItemElement)
        }
        return true
    }

    calculator() {

        for (let index = 0; index < this.data.length; index++) {
            const dataItem = this.data[index];

            let calcVal = 0

            if (!dataItem?.values) throw new Error("")

            for (let index = 0; index < dataItem.values.length; index++) {
                const { type, priceCalcOption, value, name } = dataItem.values[index];
                const stateValue = this.state.ranges[name.toLowerCase()]

                if (type === "default" && typeof value === "number") {
                    calcVal += value * (stateValue - (priceCalcOption?.freeAmount ?? 0))
                }

                if (type === "options" && typeof value === "object") {

                    const { id } = this.getSelectedOptionId({ radioName: dataItem.name });
                    const optionValue: IValue | null = value?.filter(v => v.name === id)?.[0] ?? null

                    if (optionValue) {
                        calcVal += optionValue.value * (stateValue - (priceCalcOption?.freeAmount ?? 0))
                    }
                }

            }

            const { minValue, maxValue } = dataItem.settings

            calcVal = calcVal < minValue
                ? minValue
                : (maxValue && calcVal > maxValue)
                    ? maxValue
                    : calcVal

            this.setCalcData({ name: dataItem.name, value: calcVal })
        }
    }

    eventHandler({ element }: { element: HTMLInputElement }) {
        const { id, value } = element

        if (typeof this.state.ranges[id] === "number") {
            this.state.ranges[id] = Number(value)
            this.changeRangeLabel({ id, value })
        }

        this.calculator()
        this.chart()
    }

    getSelectedOptionId({ radioName }: { radioName: string }): { id: string } {
        let id: string = ""
        document.querySelectorAll(`input[name='${radioName}-radio']`).forEach(elem => {
            if ((elem as HTMLInputElement).checked) {
                id = (elem as HTMLInputElement).id
            }
        })
        return { id }
    }

    chart() {

        let max: { name: string, value: number }[] = []
        let min: { name: string, value: number }[] = []

        this.state.calcData.forEach(e => {
            if (max.length === 0) max = [e]
            else {
                max.forEach(maxElem => {
                    if (maxElem.value < e.value) max = [e]
                    else if (maxElem.value === e.value) max.push(e)
                })
            }

            if (min.length === 0) { min = [e] }
            else {
                min.forEach(minElem => {
                    if (minElem.value > e.value) min = [e]
                    else if (minElem.value === e.value) min.push(e)
                })
            }
        })


        for (let index = 0; index < this.state.calcData.length; index++) {
            const { name, value } = this.state.calcData[index];
            const element: HTMLElement | null = document.querySelector(`[data-name*="${name}"]`);

            if (!element) return

            const elemMax = max.filter(e => e.name === name)[0]
            const elemMin = min.filter(e => e.name === name)[0]

            let isMinElem: boolean = name === elemMin?.name


            element.style.setProperty('--percentages-chart', `${(value * 100) / ((elemMax?.value ?? 0) + CHART_TOP_GAP)}%`);
            element.style.setProperty('--data-chart-background', isMinElem ? element.getAttribute('data-color') : "rgb(168, 168, 168)");
            element.setAttribute('data-chart-value', `${value}`);
        }
    }

    changeRangeLabel({ id, value }: { id: string, value: string }) {
        const element = document.querySelector(`#${id}-label`)?.querySelector(`span`)
        if (!element) return
        element.innerHTML = value
    }
}





const DATA: IData[] = [
    {
        name: "backblaze.com",
        settings: {
            minValue: 7,
            maxValue: null,
            color: "red"
        },
        values: [
            {
                id: 1,
                name: "Storage",
                type: "default",
                priceCalcOption: null,
                value: 0.005
            },
            {
                id: 2,
                name: "Transfer",
                type: "default",
                priceCalcOption: null,
                value: 0.01
            },
        ]
    },
    {
        name: "bunny.net",
        settings: {
            minValue: 0,
            maxValue: 10,
            color: "orange"
        },
        values: [
            {
                id: 1,
                name: "Storage",
                type: "options",
                priceCalcOption: null,
                value: [
                    {
                        name: "HDD",
                        value: 0.01
                    },
                    {
                        name: "SSD",
                        value: 0.02
                    },
                ]
            },
            {
                id: 2,
                name: "Transfer",
                type: "default",
                priceCalcOption: null,
                value: 0.01
            },
        ]
    },
    {
        name: "scaleway.com",
        settings: {
            minValue: 0,
            maxValue: null,
            color: "purple"
        },
        values: [
            {
                id: 1,
                name: "Storage",
                type: "options",
                priceCalcOption: { freeAmount: 75 },
                value: [
                    {
                        name: "Multi",
                        value: 0.06
                    },
                    {
                        name: "Single",
                        value: 0.03
                    },
                ]
            },
            {
                id: 2,
                name: "Transfer",
                type: "default",
                priceCalcOption: { freeAmount: 75 },
                value: 0.02
            },
        ]
    },
    {
        name: "vultr.com",
        settings: {
            minValue: 5,
            maxValue: null,
            color: "blue"
        },
        values: [
            {
                id: 1,
                name: "Storage",
                type: "default",
                priceCalcOption: null,
                value: 0.01
            },
            {
                id: 2,
                name: "Transfer",
                type: "default",
                priceCalcOption: null,
                value: 0.01
            },
        ]
    }
]




