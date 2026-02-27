import { Component, OnInit } from "@angular/core";
import * as echarts from "echarts/core";
import { Z } from "@angular/cdk/keycodes";

@Component({
    selector: "app-echart-bar",
    templateUrl: "./echart-bar.component.html",
    styleUrls: ["./echart-bar.component.scss"],
    standalone: false
})
export class EchartBarComponent implements OnInit {
  dataAxis = [
    "mango",
    "banana",
    "jack",
    "sparrow",
    "clara",
    "smith",
    "john",
    "doe",
    "naem",
    "hridoy",
    "ricky",
    "fahim",
    "sandy",
    "savage",
    "slow",
    "snow",
    "kashmir",
    "great wall",
    "godzilla",
    "genious"
  ];
  data = [
    220,
    182,
    191,
    234,
    290,
    330,
    310,
    123,
    442,
    321,
    90,
    149,
    210,
    122,
    133,
    334,
    198,
    123,
    125,
    220
  ];
  yMax = 500;
  dataShadow = [];

  constructor() {}

  ngOnInit() {
    for (var i = 0; i < this.data.length; i++) {
      this.dataShadow.push(this.yMax);
    }
  }

zoomBarOptions = {
    // title: {
    //   text: "Bar Chart with Zoom Option",
    //   subtext: "Feature Sample: Gradient Color, Shadow, Click Zoom"
    // },
    color: ['rgba(15, 21, 77, 0.8)','rgba(246,107,191, 0.8)','#03A9F4','#FFC107','rgba(15, 21, 77, 0.6)','#9C27BB','rgba(15, 21, 77, 0.4)','rgba(146, 213, 249, 0.8)','#9C27B0'],
    xAxis: {
      data: this.dataAxis,
      axisLabel: {
        inside: true,
        position: 'insideBottom',
        align: 'left',
        rotate: 90,
        textStyle: {
          color: "#fff"
        }
      },
      axisTick: {
        show: false
      },
      axisLine: {
        show: false
      },
      z: 10
    },
    yAxis: {
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        textStyle: {
          color: "#999"
        }
      }
    },
    dataZoom: [
      {
        type: "inside"
      }
    ],
    series: [
      {
        // For shadow
        type: "bar",
        itemStyle: {
          normal: { color: "rgba(0,0,0,0.05)" }
        },
        barGap: "-100%",
        barCategoryGap: "40%",
        data: this.dataShadow,
        animation: false
      },
      {
        type: "bar",
        itemStyle: {
          normal: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#83bff6" },
              { offset: 0.5, color: "#188df0" },
              { offset: 1, color: "#03A9F4" }
            ])
          },
          emphasis: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#2378f7" },
              { offset: 0.7, color: "#2378f7" },
              { offset: 1, color: "#83bff6" }
            ])
          }
        },
        data: this.data
      }
    ]
  };

  // ================================================

  labelOption = {
    normal: {
        show: true,
        position: 'insideBottom',
        distance: 5,
        align: 'left',
        verticalAlign: 'middle',
        rotate: 90,
        formatter: '{c}  {name|{a}}',
        fontSize: 16,
        rich: {
            name: {
                textBorderColor: '#fff'
            }
        }
    }
};


clusteredVBarOptions = {
  color: ['rgba(15, 21, 77, 0.8)','rgba(246,107,191, 0.8)','#03A9F4','#FFC107','rgba(15, 21, 77, 0.6)','#9C27BB','rgba(15, 21, 77, 0.4)','rgba(146, 213, 249, 0.8)','#9C27B0'],
    tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        }
    },
    legend: {
      data: ['Forest', 'Steppe', 'Desert', 'Wetland']
    },
    toolbox: {
        show: true,
        orient: 'vertical',
        left: 'right',
        top: 'center',
        feature: {
            mark: {show: true},
            dataView: {show: true, readOnly: false},
            magicType: {show: true, type: ['line', 'bar', 'stack', 'tiled']},
            restore: {show: true},
            saveAsImage: {show: true}
        }
        
    },
    calculable: true,
    xAxis: [
        {
            type: 'category',
            axisTick: {show: false},
            data: ['2012', '2013', '2014', '2015', '2016']
        }
    ],
    yAxis: [
        {
            type: 'value'
        }
    ],
    series: [
        {
            name: 'Forest',
            type: 'bar',
            barGap: 0,
            label: this.labelOption,
            data: [320, 332, 301, 334, 390]
        },
        {
            name: 'Steppe',
            type: 'bar',
            label: this.labelOption,
            data: [220, 182, 191, 234, 290]
        },
        {
            name: 'Desert',
            type: 'bar',
            label: this.labelOption,
            data: [150, 232, 201, 154, 190]
        },
        {
            name: 'Wetland',
            type: 'bar',
            label: this.labelOption,
            data: [98, 77, 101, 99, 40]
        }
    ]
};


// ====================================================


middleBarOption = {
  color: ['rgba(15, 21, 77, 0.8)','rgba(15, 21, 77, 0.5)','#03A9F4','#FFC107','rgba(15, 21, 77, 0.6)','#9C27BB','rgba(15, 21, 77, 0.4)','rgba(146, 213, 249, 0.8)','#9C27B0'],
    tooltip : {
        trigger: 'axis',
        axisPointer : {
            type : 'shadow'
        }
    },
    legend: {
        data:['Mango', 'Banana', 'Litchi']
    },
    grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
    },
    xAxis : [
        {
            type : 'value'
        }
    ],
    yAxis : [
        {
            type : 'category',
            axisTick : {show: false},
            data : ['2001','2002','2003','2004','2005','2006','2007']
        }
    ],
    series : [
        {
            name:'Fruits',
            type:'bar',
            label: {
                normal: {
                    show: true,
                    position: 'inside'
                }
            },
            data:[200, 170, 240, 244, 200, 220, 210]
        },
        {
            name:'Production',
            type:'bar',
            stack: 'Loss',
            label: {
                normal: {
                    show: true
                }
            },
            data:[320, 302, 341, 374, 390, 450, 420]
        },
        {
            name:'Loss',
            type:'bar',
            stack: 'Loss',
            label: {
                normal: {
                    show: true,
                    position: 'left'
                }
            },
            data:[-120, -132, -101, -134, -190, -230, -210]
        }
    ]
};


}
