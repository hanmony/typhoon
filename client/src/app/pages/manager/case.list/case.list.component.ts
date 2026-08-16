import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import ExcelJS from 'exceljs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { Subject } from 'rxjs';
import { CommonNzModule } from '../../../common.nz.module';
import { CaseDto, CaseStatus } from '../../../domain/case.dto';
import { RolesInDirective } from '../../../middlewares/roles.in.directive';
import { ValueOfPipe } from '../../../middlewares/valueof.pipeline';
import { ApiService } from '../../../services/api.service';
import { UtilsService } from '../../case-detail/services/utils.service';

@Component({
  selector: 'app-case.list',
  imports: [CommonNzModule, RolesInDirective, ValueOfPipe],
  templateUrl: './case.list.component.html',
  styleUrl: './case.list.component.less',
})
export class CaseListComponent implements OnInit {
  constructor(
    readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly messages: NzMessageService,
    private readonly utils: UtilsService,
    private readonly api: ApiService,
  ) {
    activatedRoute.params.subscribe((params) =>
      this.handleParamsChanged(params),
    );
  }

  exporting: boolean = false;
  loading = false;
  cases$ = new Subject<CaseDto[]>();

  get caseStatus(): string {
    return String(this._caseStatus);
  }
  set caseStatus(value: string) {
    this._caseStatus = Number(value);
    this.fetchCases();
  }
  private _caseStatus = CaseStatus.normal;

  ngOnInit(): void {
    this.fetchCases();
  }

  handleParamsChanged(params: Params) {
    if (params['caseStatus']) {
      this._caseStatus = Number(params['caseStatus']);
      this.fetchCases();
    }
  }

  handleImportStatusChange(info: NzUploadChangeParam) {
    if (info.file.status === 'done') {
      this.messages.success('上传完成');
      this.fetchCases();
    } else if (info.type === 'error') {
      this.messages.error('上传失败:' + info.file.error.error.message);
    }
  }

  handleDeleteCase(item: CaseDto) {
    this.api.manager.deleteCase({ id: item._id }).then(() => this.fetchCases());
  }

  async export(item: CaseDto) {
    this.exporting = true;
    const detail = await this.api.manager.getCaseDetail(item._id);
    //台风总览信息
    const sheet1Rows: any[] = [];
    let title = '';
    Object.entries(detail.doc.values).forEach(([key, caseConfigItem]) => {
      // 在这里处理每个键值对
      if (caseConfigItem.key == '台风命名') {
        title = caseConfigItem.value;
      }
      sheet1Rows.push({
        类型: caseConfigItem.key,
        分类: caseConfigItem.type,
        值: caseConfigItem.value,
        配置类型: caseConfigItem.editorType,
        可写内容: caseConfigItem.editorOptions.join(','),
      });
    });
    const sheet2Rows: any[] = [];
    const sheet3Rows: any[] = [];
    const sheet4Rows: any[] = [];
    const sheet5Rows: any[] = [];
    const sheet6Rows: any[] = [];
    const sheet7Rows: any[] = [];
    const sheet8Rows: any[] = [];
    const sheet9Rows: any[] = [];
    const sheet10Rows: any[] = [];
    const sheet11Rows: any[] = [];
    const sheet12Rows: any[] = [];
    Object.entries(detail.eventsMap).forEach(([key, actionDtoList]) => {
      // 在这里处理每个键值对
      if (key == '重点事件表') {
        for (let i = 0; i < actionDtoList.length; i++) {
          const actionDto = actionDtoList[i];
          sheet2Rows.push({
            开始时间: new Date(actionDto.fromDate),
            结束时间: new Date(actionDto.toDate),
            线路号: actionDto.items.线路号,
            起始车站: actionDto.items.起始车站,
            终止车站: actionDto.items.终止车站,
            事件名称: actionDto.items.事件名称,
            类型: actionDto.items.类型,
            描述: actionDto.items.描述,
            字段名1: actionDto.items.字段名1,
            字段名2: actionDto.items.字段名2,
            字段名3: actionDto.items.字段名3,
            字段名4: actionDto.items.字段名4,
            字段名5: actionDto.items.字段名5,
            字段名6: actionDto.items.字段名6,
            字段名7: actionDto.items.字段名7,
            字段名8: actionDto.items.字段名8,
            字段名9: actionDto.items.字段名9,
            字段名10: actionDto.items.字段名10,
            字段名11: actionDto.items.字段名11,
            字段名12: actionDto.items.字段名12,
            字段名13: actionDto.items.字段名13,
            字段名14: actionDto.items.字段名14,
            字段名15: actionDto.items.字段名15,
            字段名16: actionDto.items.字段名16,
            字段名17: actionDto.items.字段名17,
            字段名18: actionDto.items.字段名18,
            字段名19: actionDto.items.字段名19,
            字段名20: actionDto.items.字段名20,
            字段名21: actionDto.items.字段名21,
            字段名22: actionDto.items.字段名22,
          });
        }
      } else if (key == '天气预警发布') {
        for (let i = 0; i < actionDtoList.length; i++) {
          const actionDto = actionDtoList[i];
          sheet3Rows.push({
            开始时间: new Date(actionDto.fromDate),
            结束时间: new Date(actionDto.toDate),
            预警内容: actionDto.items.预警内容,
            类型: actionDto.items.类型,
            等级: actionDto.items.等级,
          });
        }
      } else if (key == '预警发布及响应') {
        for (let i = 0; i < actionDtoList.length; i++) {
          const actionDto = actionDtoList[i];
          sheet4Rows.push({
            开始时间: new Date(actionDto.fromDate),
            结束时间: new Date(actionDto.toDate),
            预警种类: actionDto.items.预警种类,
            预警发布: actionDto.items.预警发布,
            响应岗位: actionDto.items.响应岗位,
            响应人数: actionDto.items.响应人数,
            重点提示: actionDto.items.重点提示,
          });
        }
      } else if (key == '线路行车措施') {
        for (let i = 0; i < actionDtoList.length; i++) {
          const actionDto = actionDtoList[i];
          sheet5Rows.push({
            开始时间: new Date(actionDto.fromDate),
            结束时间: new Date(actionDto.toDate),
            线路号: actionDto.items.线路号,
            起始车站: actionDto.items.起始车站,
            终止车站: actionDto.items.终止车站,
            上下行: actionDto.items.上下行,
            ['存车线、折返线']: actionDto.items['存车线、折返线'],
            行车措施: actionDto.items.行车措施,
            备注: actionDto.items.备注,
            重点提示: actionDto.items.重点提示,
          });
        }
      } else if (key == '路网指令措施') {
        for (let i = 0; i < actionDtoList.length; i++) {
          const actionDto = actionDtoList[i];
          sheet6Rows.push({
            开始时间: new Date(actionDto.fromDate),
            结束时间: new Date(actionDto.toDate),
            ['发布单位/部门']: actionDto.items['发布单位/部门'],
            种类: actionDto.items.种类,
            工作指令: actionDto.items.工作指令,
            工作要点: actionDto.items.工作要点,
            重点提示: actionDto.items.重点提示,
          });
        }
      } else if (key == '受台风影响运营事件') {
        for (let i = 0; i < actionDtoList.length; i++) {
          const actionDto = actionDtoList[i];
          sheet7Rows.push({
            开始时间: new Date(actionDto.fromDate),
            结束时间: new Date(actionDto.toDate),
            线路号: actionDto.items.线路号,
            类型: actionDto.items.类型,
            车站: actionDto.items.车站,
            区间起始车站: actionDto.items.区间起始车站,
            区间终止车站: actionDto.items.区间终止车站,
            上下行: actionDto.items.上下行,
            ['存车线、折返线']: actionDto.items['存车线、折返线'],
            ['基地/控制中心']: actionDto.items['基地/控制中心'],
            事件类型: actionDto.items.事件类型,
            事件详情: actionDto.items.事件详情,
            重点提示: actionDto.items.重点提示,
          });
        }
      } else if (key == '施工调整') {
        for (let i = 0; i < actionDtoList.length; i++) {
          const actionDto = actionDtoList[i];
          sheet8Rows.push({
            开始时间: new Date(actionDto.fromDate),
            结束时间: new Date(actionDto.toDate),
            线路: actionDto.items.线路,
            施工数量: actionDto.items.施工数量,
            调整措施: actionDto.items.调整措施,
            重点提示: actionDto.items.重点提示,
          });
        }
      } else if (key == '客运措施') {
        for (let i = 0; i < actionDtoList.length; i++) {
          const actionDto = actionDtoList[i];
          sheet9Rows.push({
            开始时间: new Date(actionDto.fromDate),
            结束时间: new Date(actionDto.toDate),
            线路号: actionDto.items.线路号,
            起始车站: actionDto.items.起始车站,
            终止车站: actionDto.items.终止车站,
            措施: actionDto.items.措施,
            备注: actionDto.items.备注,
            重点提示: actionDto.items.重点提示,
          });
        }
      } else if (key == '客运处置') {
        for (let i = 0; i < actionDtoList.length; i++) {
          const actionDto = actionDtoList[i];
          sheet10Rows.push({
            开始时间: new Date(actionDto.fromDate),
            结束时间: new Date(actionDto.toDate),
            线路号: actionDto.items.线路号,
            车站: actionDto.items.车站,
            类型: actionDto.items.类型,
            事件详情: actionDto.items.事件详情,
            重点提示: actionDto.items.重点提示,
          });
        }
      } else if (key == '信息报告') {
        for (let i = 0; i < actionDtoList.length; i++) {
          const actionDto = actionDtoList[i];
          sheet11Rows.push({
            开始时间: new Date(actionDto.fromDate),
            结束时间: new Date(actionDto.toDate),
            种类: actionDto.items.种类,
            报送范围: actionDto.items.报送范围,
            内容: actionDto.items.内容,
            重点提示: actionDto.items.重点提示,
          });
        }
      } else if (key == '媒体宣传') {
        for (let i = 0; i < actionDtoList.length; i++) {
          const actionDto = actionDtoList[i];
          sheet12Rows.push({
            开始时间: new Date(actionDto.fromDate),
            结束时间: new Date(actionDto.toDate),
            发布方式: actionDto.items.发布方式,
            内容: actionDto.items.内容,
            阅读量: actionDto.items.阅读量,
            评论数: actionDto.items.评论数,
            重点提示: actionDto.items.重点提示,
          });
        }
      }
    });

    const workbook = new ExcelJS.Workbook();

    //类型	分类	值	配置类型	可写内容
    const worksheet1 = workbook.addWorksheet('台风总览信息');
    worksheet1.columns = [
      { header: '类型', key: '类型', width: 20 },
      { header: '分类', key: '分类', width: 20 },
      { header: '值', key: '值', width: 30 },
      { header: '配置类型', key: '配置类型', width: 15 },
      { header: '可写内容', key: '可写内容', width: 15 },
    ];
    worksheet1.addRows(sheet1Rows);

    const worksheet2 = workbook.addWorksheet('重点事件表');
    //开始时间	结束时间	线路号	起始车站	终止车站	事件名称	类型	描述	字段名1	字段名2	字段名3	字段名4	字段名5	字段名6	字段名7	字段名8	字段名9	字段名10	字段名11	字段名12	字段名13	字段名14	字段名15	字段名16	字段名17	字段名18	字段名19	字段名20	字段名21	字段名22
    worksheet2.columns = [
      {
        header: '开始时间',
        key: '开始时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '结束时间',
        key: '结束时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '线路号', key: '线路号', width: 30 },
      { header: '起始车站', key: '起始车站', width: 15 },
      { header: '终止车站', key: '终止车站', width: 15 },
      { header: '事件名称', key: '事件名称', width: 15 },
      { header: '类型', key: '类型', width: 15 },
      { header: '描述', key: '描述', width: 15 },
      { header: '字段名1', key: '字段名1', width: 15 },
      { header: '字段名2', key: '字段名2', width: 15 },
      { header: '字段名3', key: '字段名3', width: 15 },
      { header: '字段名4', key: '字段名4', width: 15 },
      { header: '字段名5', key: '字段名5', width: 15 },
      { header: '字段名6', key: '字段名6', width: 15 },
      { header: '字段名7', key: '字段名7', width: 15 },
      { header: '字段名8', key: '字段名8', width: 15 },
      { header: '字段名9', key: '字段名9', width: 15 },
      { header: '字段名10', key: '字段名10', width: 15 },
      { header: '字段名11', key: '字段名11', width: 15 },
      { header: '字段名12', key: '字段名12', width: 15 },
      { header: '字段名13', key: '字段名13', width: 15 },
      { header: '字段名14', key: '字段名14', width: 15 },
      { header: '字段名15', key: '字段名15', width: 15 },
      { header: '字段名16', key: '字段名16', width: 15 },
      { header: '字段名17', key: '字段名17', width: 15 },
      { header: '字段名18', key: '字段名18', width: 15 },
      { header: '字段名19', key: '字段名19', width: 15 },
      { header: '字段名20', key: '字段名20', width: 15 },
      { header: '字段名21', key: '字段名21', width: 15 },
      { header: '字段名22', key: '字段名22', width: 15 },
    ];
    worksheet2.addRows(sheet2Rows);

    //开始时间	结束时间	预警内容	类型	等级
    const worksheet3 = workbook.addWorksheet('天气预警发布');
    worksheet3.columns = [
      {
        header: '开始时间',
        key: '开始时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '结束时间',
        key: '结束时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '预警内容', key: '预警内容', width: 30 },
      { header: '类型', key: '类型', width: 15 },
      { header: '等级', key: '等级', width: 15 },
    ];
    worksheet3.addRows(sheet3Rows);

    //开始时间	结束时间	预警种类	预警发布	响应岗位	响应人数	重点提示
    const worksheet4 = workbook.addWorksheet('预警响应发布');
    worksheet4.columns = [
      {
        header: '开始时间',
        key: '开始时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '结束时间',
        key: '结束时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '预警种类', key: '预警种类', width: 15 },
      { header: '预警发布', key: '预警发布', width: 15 },
      { header: '响应岗位', key: '响应岗位', width: 15 },
      { header: '响应人数', key: '响应人数', width: 15 },
      { header: '重点提示', key: '重点提示', width: 15 },
    ];
    worksheet4.addRows(sheet4Rows);

    //开始时间	结束时间	线路号	起始车站	终止车站	上下行	存车线、折返线	行车措施	备注	重点提示
    const worksheet5 = workbook.addWorksheet('线路行车措施');
    worksheet5.columns = [
      {
        header: '开始时间',
        key: '开始时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '结束时间',
        key: '结束时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '线路号', key: '线路号', width: 30 },
      { header: '起始车站', key: '起始车站', width: 15 },
      { header: '终止车站', key: '终止车站', width: 15 },
      { header: '上下行', key: '上下行', width: 15 },
      { header: '存车线、折返线', key: '存车线、折返线', width: 15 },
      { header: '行车措施', key: '行车措施', width: 15 },
      { header: '备注', key: '备注', width: 15 },
      { header: '重点提示', key: '重点提示', width: 15 },
    ];
    worksheet5.addRows(sheet5Rows);

    //开始时间	结束时间	发布单位/部门	种类	工作指令	工作要点	重点提示
    const worksheet6 = workbook.addWorksheet('路网指令措施');
    worksheet6.columns = [
      {
        header: '开始时间',
        key: '开始时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '结束时间',
        key: '结束时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '发布单位/部门', key: '发布单位/部门', width: 15 },
      { header: '种类', key: '种类', width: 15 },
      { header: '工作指令', key: '工作指令', width: 15 },
      { header: '工作要点', key: '工作要点', width: 15 },
      { header: '重点提示', key: '重点提示', width: 15 },
    ];
    worksheet6.addRows(sheet6Rows);

    //开始时间	结束时间	线路号	类型	车站	区间起始车站	区间终止车站	上下行	存车线、折返线	基地/控制中心	事件类型	事件详情	重点提示
    const worksheet7 = workbook.addWorksheet('受台风影响运营事件');
    worksheet7.columns = [
      {
        header: '开始时间',
        key: '开始时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '结束时间',
        key: '结束时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '线路号', key: '线路号', width: 15 },
      { header: '类型', key: '类型', width: 15 },
      { header: '车站', key: '车站', width: 15 },
      { header: '区间起始车站', key: '区间起始车站', width: 15 },
      { header: '区间终止车站', key: '区间终止车站', width: 15 },
      { header: '上下行', key: '上下行', width: 15 },
      { header: '存车线、折返线', key: '存车线、折返线', width: 15 },
      { header: '基地/控制中心', key: '基地/控制中心', width: 15 },
      { header: '事件类型', key: '事件类型', width: 15 },
      { header: '事件详情', key: '事件详情', width: 15 },
      { header: '重点提示', key: '重点提示', width: 15 },
    ];
    worksheet7.addRows(sheet7Rows);

    //开始时间	结束时间	线路	施工数量	调整措施	重点提示
    const worksheet8 = workbook.addWorksheet('施工调整');
    worksheet8.columns = [
      {
        header: '开始时间',
        key: '开始时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '结束时间',
        key: '结束时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '线路', key: '线路', width: 15 },
      { header: '施工数量', key: '施工数量', width: 15 },
      { header: '调整措施', key: '调整措施', width: 15 },
      { header: '重点提示', key: '重点提示', width: 15 },
    ];
    worksheet8.addRows(sheet8Rows);

    //开始时间	结束时间	线路号	起始车站	终止车站	措施	备注	重点提示
    const worksheet9 = workbook.addWorksheet('客运措施');
    worksheet9.columns = [
      {
        header: '开始时间',
        key: '开始时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '结束时间',
        key: '结束时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '线路号', key: '线路号', width: 15 },
      { header: '起始车站', key: '起始车站', width: 15 },
      { header: '终止车站', key: '终止车站', width: 15 },
      { header: '措施', key: '措施', width: 15 },
      { header: '备注', key: '备注', width: 15 },
      { header: '重点提示', key: '重点提示', width: 15 },
    ];
    worksheet9.addRows(sheet9Rows);

    //开始时间	结束时间	线路号	车站	类型	事件详情	重点提示
    const worksheet10 = workbook.addWorksheet('客运处置');
    worksheet10.columns = [
      {
        header: '开始时间',
        key: '开始时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '结束时间',
        key: '结束时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '线路号', key: '线路号', width: 15 },
      { header: '车站', key: '车站', width: 15 },
      { header: '类型', key: '类型', width: 15 },
      { header: '事件详情', key: '事件详情', width: 15 },
      { header: '重点提示', key: '重点提示', width: 15 },
    ];
    worksheet10.addRows(sheet10Rows);

    //开始时间	结束时间	种类	报送范围	内容	重点提示
    const worksheet11 = workbook.addWorksheet('信息报告');
    worksheet11.columns = [
      {
        header: '开始时间',
        key: '开始时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '结束时间',
        key: '结束时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '种类', key: '种类', width: 15 },
      { header: '报送范围', key: '报送范围', width: 15 },
      { header: '内容', key: '内容', width: 15 },
      { header: '重点提示', key: '重点提示', width: 15 },
    ];
    worksheet11.addRows(sheet11Rows);

    //开始时间	结束时间	发布方式	内容	阅读量	评论数	重点提示
    const worksheet12 = workbook.addWorksheet('媒体宣传');
    worksheet12.columns = [
      {
        header: '开始时间',
        key: '开始时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      {
        header: '结束时间',
        key: '结束时间',
        width: 20,
        style: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      },
      { header: '发布方式', key: '发布方式', width: 15 },
      { header: '内容', key: '内容', width: 15 },
      { header: '阅读量', key: '阅读量', width: 15 },
      { header: '评论数', key: '评论数', width: 15 },
      { header: '重点提示', key: '重点提示', width: 15 },
    ];
    worksheet12.addRows(sheet12Rows);

    // 在浏览器中，我们使用 writeBuffer 方法
    workbook.xlsx.writeBuffer().then((buffer) => {
      // 创建一个Blob对象
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      // 创建一个下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}_台风数据_${new Date().getTime()}.xlsx`;
      a.click();
      // 释放URL对象
      window.URL.revokeObjectURL(url);
    });

    this.exporting = false;
    this.messages.success('导出成功');
  }

  edit(item: CaseDto) {
    this.router.navigate([
      '/manager/editor',
      { id: item._id, status: this.caseStatus },
    ]);
  }

  toFrontEndGuide(item: CaseDto) {
    this.router.navigate(['/guide', { id: item._id }]);
  }

  private async fetchCases() {
    this.loading = true;
    const items = await this.api.manager
      .getCases(this._caseStatus)
      .finally(() => (this.loading = false));
    this.cases$.next(items);
  }
}
