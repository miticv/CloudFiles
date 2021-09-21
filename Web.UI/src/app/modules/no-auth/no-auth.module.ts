import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TermsofserviceComponent } from './termsofservice/termsofservice.component';
import { PrivacystatementComponent } from './privacystatement/privacystatement.component';


@NgModule({
  declarations: [

    TermsofserviceComponent,
    PrivacystatementComponent
  ],
  imports: [
    CommonModule
  ]
})
export class NoAuthModule { }
