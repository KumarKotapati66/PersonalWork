import { LightningElement,track } from 'lwc';

export default class FrankFurtureApi extends LightningElement {
    response;
    error;
   @track options=[];
   @track currencyOptions = {
    amount:0,
    fromCurrency:'',
    toCurrency:''};
   convertedCurrency;
    connectedCallback() {
        fetch('https://api.frankfurter.dev/v1/currencies ')
            .then(response => response.json())
            .then((data) => {
                this.options = Object.keys(data).map(element => {
                  return  {
                        value: element,
                        label: data[element]
                    };
                });
                this.response = JSON.stringify(data); 
                console.log('API Response:', this.response);
            })
            .catch((error) => {
                this.error = error;
                console.error('Error fetching API:', this.error);
            });
    }
    handleChange(event) {
        console.log('handleChange event', event.detail.value, event.target.name);
        this.currencyOptions[event.target.name] = event.detail.value;
        this.validate();
    }
    validate(){
        if(this.currencyOptions.fromCurrency && this.currencyOptions.toCurrency && this.currencyOptions.amount){
            this.convert();
        }
    }
    convert(){
        console.log('convert method');
        fetch(`https://api.frankfurter.dev/v1/latest?base=${this.currencyOptions.fromCurrency}&symbols=${this.currencyOptions.toCurrency}`)
        .then(response => response.json())
        .then((data) =>{
            console.log(data);
            this.convertedCurrency = this.currencyOptions.amount*data.rates[this.currencyOptions.toCurrency];
        })
        .catch((error) => {
            this.error = error;
            console.error('Error fetching API:', this.error);
        });
    }
}