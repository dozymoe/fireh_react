import { MDCCheckbox } from '@material/checkbox';
import { MDCDataTable } from '@material/data-table';
import { MDCDrawer } from '@material/drawer';
import { MDCFormField } from '@material/form-field';
import { MDCRipple } from '@material/ripple';
import { MDCTextField } from '@material/textfield';
import { MDCTopAppBar } from '@material/top-app-bar';

document.addEventListener('DOMContentLoaded', function()
{
    for (let el of document.querySelectorAll('.mdc-form-field'))
    {
        new MDCFormField(el);
    }
    for (let el of document.querySelectorAll('.mdc-checkbox'))
    {
        new MDCCheckbox(el);
    }
    for (let el of document.querySelectorAll('.mdc-text-field'))
    {
        new MDCTextField(el);
    }
    for (let el of document.querySelectorAll('.mdc-data-table'))
    {
        new MDCDataTable(el);
    }
    for (let el of document.querySelectorAll(
            '.mdc-button, .mdc-icon-button', '.mdc-card__primary-action'))
    {
        new MDCRipple(el);
    }

    let appbar = new MDCTopAppBar(document.querySelector('.mdc-top-app-bar'));
    appbar.setScrollTarget(document.getElementById('main'));

    let elDrawer = document.querySelector('.mdc-drawer');
    if (elDrawer)
    {
        let drawer = new MDCDrawer(elDrawer);
        appbar.listen(
                'MDCTopAppBar:nav',
                () => { drawer.open = !drawer.open; });
    }
});
