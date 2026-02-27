import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_EXAMPLE_COMPONENT_LIST } from '.';
import { SharedComponentsModule } from 'app/shared/components/shared-components.module';
import { exampleMaterialModules } from 'app/shared/material-imports';

@NgModule({
  declarations: [...MATERIAL_EXAMPLE_COMPONENT_LIST],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ...exampleMaterialModules,
    SharedComponentsModule,
  ],
  exports: [...MATERIAL_EXAMPLE_COMPONENT_LIST],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
  // entryComponents: [...MATERIAL_EXAMPLE_COMPONENT_LIST]
})
export class MaterialExamplesModule { }
