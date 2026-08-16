import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { totalTableData } from '../../../digital-plan.data.component';

@Component({
  selector: 'app-typhoon-impacts-table',
  templateUrl: './typhoon-impacts-table.component.html',
  styleUrls: ['./typhoon-impacts-table.component.less'],
  standalone: true,
  imports: [CommonModule],
})
export class TyphoonImpactsTableComponent implements OnInit {
  totalTableData = totalTableData;

  constructor() {}

  ngOnInit(): void {}
}
