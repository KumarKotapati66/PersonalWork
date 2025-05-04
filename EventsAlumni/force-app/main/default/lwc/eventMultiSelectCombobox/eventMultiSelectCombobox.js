import { LightningElement, api, track, wire } from 'lwc';

export default class eventMultiSelectCombobox extends LightningElement {
    @api placeholder = '';
    showDD = false;
    init = false;
    isExpanded = false;
    isSelectAll = false;
    @api selectedvalues = '';
    @api options = [];

    // Static options for testing
    /*@track options = [
        { label: 'Seminar', value: 'Seminar', show: true, checked: false },
        { label: 'Conference', value: 'Conference', show: true, checked: false },
        { label: 'Virtual Submits', value: 'Virtual Submits', show: true, checked: false },
        { label: 'Exhibitions', value: 'Exhibitions', show: true, checked: false },
    ];*/
    @api label = 'Select Options';
    @api required = false;
    @api showpills = false;

    /*@wire(getOptions)
    wiredOptions({ error, data }) {
        if (data) {
            this.options = data.map(option => ({
                label: option,
                value: option,
                show: true,
                checked: false
            }));
        } else if (error) {
            console.error('Error fetching picklist values:', error);
        }
    }*/

    renderedCallback() {
        if (!this.init) {
            this.template.querySelector('.cmpl-input').addEventListener('click', (event) => {
                if (this.showDD) {
                    this.showDD = !this.showDD;
                } else {
                    let opts = this.options ? this.options.filter((element) => element.show).length : 0;
                    this.showDD = opts > 0;
                }
                event.stopPropagation();
            });
            this.template.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            document.addEventListener('click', () => {
                this.showDD = false;
            });
            this.init = true;
        }
    }

    onSearch(event) {
        this.options.forEach(option => {
            option.show = option.label.toLowerCase().startsWith(event.detail.value.toLowerCase());
        });
        let filteredopts = this.options.filter((element) => element.show);
        this.showDD = filteredopts.length > 0;
    }

    onSelect(event) {
        const value = event.target.value;
        const isChecked = event.target.checked;

        console.log('Selected value:', value, 'Checked:', isChecked);

        if (value === 'Select All') {
            // Update all options when "Select All" is selected
            this.options = this.options.map(option => {
                return { ...option, checked: isChecked };
            });
        } else {
            // Update the specific option based on the checked status
            this.options = this.options.map(option => {
                if (option.value === value) {
                    return { ...option, checked: isChecked };
                }
                return option;
            });

            // Check if all items are selected, then automatically check "Select All"
            const allSelected = this.options.filter(option => option.value !== 'Select All').every(option => option.checked);
            this.options = this.options.map(option => {
                if (option.value === 'Select All') {
                    return { ...option, checked: allSelected };
                }
                return option;
            });
        }
        const allSelected = this.options.every(option => option.checked);
        // Update "Select All" checkbox            
        this.isSelectAllChecked = allSelected;

        // Update the placeholder based on selected items
        this.postSelect();

        // Send the updated list of selected options to the parent component
        this.sendSelectedOptions();
    }


    onRemove(event) {
        const value = event.detail.name;

        console.log('Removing value:', value);

        // Find the option to update
        this.options = this.options.map(option => {
            if (option.label === value) {
                return { ...option, checked: false };
            }
            return option;
        });

        this.sendSelectedOptions();
        // Update the placeholder based on selected items
        this.postSelect();

        // Send the updated list of selected options to the parent component

    }
    @api
    postSelect() {
        const count = this.options.filter(option => option.checked).length;
        this.selectedvalues = this.options
            .filter(option => option.checked)
            .map(option => option.label)
            .join(', ');
        this.placeholder = count > 0 ? `${count} Item(s) Selected. ${this.selectedvalues}` : '';
    }

    sendSelectedOptions() {
        // Generate a string of selected labels
        const selectedLabels = this.options
            .filter(option => option.checked)
            .map(option => option.label)
            .join(';');

        console.log('Sending selected options:', selectedLabels);

        // Dispatch a custom event with the selected options
        const selectEvent = new CustomEvent('selected', { detail: selectedLabels });
        this.dispatchEvent(selectEvent);
    }

}