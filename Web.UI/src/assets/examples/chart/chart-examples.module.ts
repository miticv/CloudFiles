import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CHART_EXAMPLE_COMPONENT_LIST } from '.';
import { NgxEchartsModule } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, PieChart, LineChart, RadarChart, HeatmapChart } from 'echarts/charts';
import { 
  GridComponent, 
  LegendComponent, 
  TitleComponent, 
  TooltipComponent, 
  DataZoomComponent, 
  ToolboxComponent,
  VisualMapComponent,
} from 'echarts/components';
echarts.use([
  BarChart, 
  GridComponent, 
  CanvasRenderer, 
  LegendComponent, 
  TitleComponent, 
  TooltipComponent, 
  PieChart, 
  LineChart, 
  DataZoomComponent, 
  ToolboxComponent,
  RadarChart,
  VisualMapComponent,
  HeatmapChart
]);
import { commonMaterialModules, allMaterialModules } from 'app/shared/material-imports';

@NgModule({
  declarations: [...CHART_EXAMPLE_COMPONENT_LIST],
  imports: [
    NgxEchartsModule.forRoot({
      echarts
    }),
    CommonModule,
    ...commonMaterialModules,
    ...allMaterialModules,
  ],
  exports: [...CHART_EXAMPLE_COMPONENT_LIST],
  // entryComponents: [...CHART_EXAMPLE_COMPONENT_LIST]
})
export class ChartExamplesModule { }
