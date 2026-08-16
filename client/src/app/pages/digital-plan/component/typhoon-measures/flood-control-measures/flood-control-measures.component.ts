import { Component, OnInit } from '@angular/core';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-flood-control-measures',
  templateUrl: './flood-control-measures.component.html',
  styleUrls: ['./flood-control-measures.component.less'],
  standalone: true,
})
export class FloodControlMeasuresComponent implements OnInit {
  hideTitle = environment.hideTitle;
  constructor() {}

  ngOnInit(): void {}
}
