import {Component, inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {
  MatSlideToggleModule,
  _MatSlideToggleRequiredValidatorModule,
} from '@angular/material/slide-toggle';

@Component({
    selector: 'app-configurable-toggle',
    templateUrl: './configurable-toggle.component.html',
    styleUrls: ['./configurable-toggle.component.scss'],
    standalone: false
})
export class ConfigurableToggleComponent {
  private _formBuilder = inject(FormBuilder);

  isChecked = true;
  formGroup = this._formBuilder.group({
    enableWifi: '',
    acceptTerms: ['', Validators.requiredTrue],
  });

  alertFormValues(formGroup: FormGroup) {
    alert(JSON.stringify(formGroup.value, null, 2));
  }
}
