'use strict';
import React from 'react';
import ReactDom from 'react-dom';
import classnames from 'classnames';
import upload from './api/upload';
import importer from './api/importer';
import history from './api/history';
import sendfirstline from './api/sendfirstline';
import validatemap from './api/validatemap';
import HistoryTable from './components/HistoryTable';
import errorDialog from './services/errorDialog';
import ComnFuncs from './common/common';
import MapFuncs from './common/mappingfuncs';
import importtemplate from './api/importtemplate';
import MultiTabs from './components/MultiTabs';
import { setFileData, setDynamicColArray, getSampleData } from './services/fileService';
import { setCustMapInfo, setEEImpSelOption, setRedirectInfo } from './services/fileService';
import { getMultiTabInfo, getSelectedMultiTabInfo } from './services/fileService';

var alloy = window.alloy;
var
    fileTypes = {
        1: 'EmployeeImport',
        2: 'MappedFileImport'
    },
    selectedFileType = {
        1: 'Employee Import',
        2: 'Mapped File Import'
    },
    EEIMP = 1,
    errorTitle = 'Upload Error',
    importTypeInfo = 'Selected Import Type is: ',
    importTypeFullInfo = '',
    noValidMappingsFound = 'No valid mappings match for the selected file',
    mapColumnLink = '#/mapcolumns/',
    coldata = [],
    columnCount,
    emptyString = '',
    delimComma = ',',
    noColHdrTxt = 'No Column Header',
    isEdit = false,
    eeImportSelOpt = emptyString,
    show = '.showing',
    noShow = '',
    eeImportOptValues = {
        1: 'CancelImportOnErrorsOrWarnings',
        2: 'ContinueImport'
    },
    optSelCanIEW = false,
    optSelConI = false,
    mappingsEndpoint = '/importhubservice/importhub/v1/mappings/',
    templateSuffix = '/template',
    isMultiTab = false,
    multiTabInfo,
    selMultiTabInfo,
    resetMultiTab = true;

function getInitialState() {
    return {
        dndCss: 'showing',
        dropCss: emptyString,
        templateDropCss: 'showing',
        lblCss: emptyString,
        eeCss: noShow,
        optSelCanIEW: optSelCanIEW,
        optSelConI: optSelConI,
        unpopulated: true,
        disableCustMap: true,
        disableDownloadTemp: true,
        multiTabInfo: multiTabInfo,
        mtCss: noShow,
        selMultiTabInfo: selMultiTabInfo,
        resetMultiTab: resetMultiTab
    };
}

export default class Import extends React.Component {

    constructor(props) {
        super(props);
        this.state = getInitialState();
    }

    componentDidMount () {
        importer.abort();
        alloy.dialog.hide();

        var
            dnd = this.refs.dnd,
            drop = this.refs.drop,
            dropTemp = this.refs.dropImportTemplate;

        this.saveRedirectInfo();
        this.selectedMappings = null;
        this.fileType = null;
        this.selectedTemplateMapping = null;

        importtemplate({
            callback: this.getImportTemplateMappings.bind(this),
            errback: this.onCancel.bind(this)
        });

        dnd.init = () => {
            dnd.on('change', (event) => {
                this.saveRedirectInfo();
            this.hideDrop();
            this.resetImportOptions();
            this.resetMultiTabInfo();
            this.setState({
                unpopulated: true,
                disableCustMap:true,
                lblCss:'',
                eeCss: noShow,
                optSelCanIEW: optSelCanIEW,
                optSelConI: optSelConI,
                multiTabInfo: multiTabInfo,
                mtCss: noShow,
                selMultiTabInfo: selMultiTabInfo,
                resetMultiTab: resetMultiTab
            });

            if (event.value || event.files){
                this.file = event.value || event.files[0];
                console.log('file ready', this.file);

                MapFuncs.onDropdownClear(drop);

                sendfirstline({
                    file: this.file,
                    callback: this.onFirstLinePost.bind(this),
                    errback: this.onCancel.bind(this)
                });
            }
        });
        };

        drop.init = () => {
            drop.on('change',(event) => {
                this.selectedMappings = null;
            this.resetImportOptions();
            if (event.value) {
                this.selectedMappings = MapFuncs.getSelectedMappings(event.value, this.availableMappings);
                if (this.selectedMappings) {
                    this.setState({
                        dropCss:'showing',
                        lblCss: emptyString,
                        eeCss: noShow,
                        optSelCanIEW: optSelCanIEW,
                        optSelConI: optSelConI,
                        unpopulated:false,
                        disableCustMap:false,
                        mtCss: noShow
                    });
                }else {
                    this.setStateOnNoSelect();
                }
            }
            else {
                this.setStateOnNoSelect();
            }
        });
        };

        dropTemp.init = () => {
            dropTemp.on('change',(event) => {
                if (event.value) {
                this.selectedTemplateMapping = event.value;
                this.setState({ disableDownloadTemp: false });
            }
        });
        };

        history.start((data) => {
            if(this.refs.history != null) {
            this.refs.history.setData(data);
        }
    });
    }

    componentWillUnmount () {
        this.setState(getInitialState());
        history.stop();
    }

    onUploadClick () {
        if (this.fileType === fileTypes[EEIMP]) {
            upload({
                file: this.file,
                selectedMappings: null,
                eeMapping: eeImportSelOpt,
                errback: this.onCancel.bind(this)
            });
        } else {
            var allSheetsMappings = [];
            if (this.isMultiTab) {
                setFileData(this.file, this.fileType, null, null, null);
                selMultiTabInfo = getSelectedMultiTabInfo();
                var allSheetsInfo = selMultiTabInfo.selectedTabsInfo;
                allSheetsInfo.forEach(function(currentSheet) {
                    var currentMapping = currentSheet.mapping;
                    currentMapping.mappingName = currentSheet.tabName;
                    allSheetsMappings.push(currentMapping);
                });
                upload({
                    file: this.file,
                    fileType: this.fileType,
                    multiTab: this.isMultiTab,
                    selectedMappings: allSheetsMappings,
                    errback: this.onCancel.bind(this)
                });

            } else {
                setFileData(this.file, this.fileType, null, null, this.selectedMappings);
                validatemap({
                    upload: true,
                    columnheaders: '',
                    mapping: this.selectedMappings,
                    callback: this.onValidatePost.bind(this),
                    errback: this.onValidatePost.bind(this)
                });
            }
        }
    }
    
    onDownloadTmplClick () {
        var url = mappingsEndpoint + this.selectedTemplateMapping + templateSuffix;
        window.open(url,'_blank');
    }

    onCustMapClick() {
        isEdit = false;
        if ((this.selectedMappings) && (this.selectedMappings[0].docUrl === null)) {
            isEdit = true;
        }
        if (isEdit){
            setCustMapInfo(isEdit, this.selectedMappings, emptyString, this.allGenMappings);
            setFileData(this.file, this.fileType, null, null, this.selectedMappings);
            validatemap({
                upload: false,
                columnheaders: '',
                mapping: this.selectedMappings,
                callback: this.onValidatePost.bind(this),
                errback: this.onValidatePost.bind(this)
            });

        } else {
            var mappings;
            if (this.selectedMappings) {
                mappings = this.selectedMappings;
            } else {
                mappings = this.allMappings;
            }
            setCustMapInfo(isEdit, mappings, emptyString, this.allGenMappings);
            setFileData(this.file, this.fileType, MapFuncs.getDropItems(mappings), mappings, this.selectedMappings);
            this.gotoMapColumns();
        }
    }

    onCancel () {
        this.setState(getInitialState());
        this.refs.dnd.reset();
        var drop = this.refs.drop;
        MapFuncs.onDropdownClear(drop);
        eeImportSelOpt = emptyString;
        this.resetImportOptions();
        console.dir(this.refs.dnd);
    }

    getFileTypeInfo(fileType){
        if (fileType === fileTypes[EEIMP]){
            importTypeFullInfo =  importTypeInfo + selectedFileType[EEIMP];
        }
        return importTypeFullInfo;
    }

    getImportTemplateMappings(result){
        var mappings = result;
        var dropTemp = this.refs.dropImportTemplate,
            dropItems = MapFuncs.getDropItems(mappings);
        this.populateDropdown(dropTemp, dropItems);
    }

    onFirstLinePost(result){
        var
            err,
            fileType = result.fileType,
            availableMappings = result.mappings,
            isCustomMap = result.isCustomMap,
            allMappings = result.allMappings;

        this.columnCount = result.columnCount;
        this.fileType = fileType;
        this.availableMappings = null;
        this.allMappings = null;
        this.allGenMappings = null;
        this.isMultiTab = result.isMultiTab;

        this.refs.lblfileinfo.innerHTML = this.getFileTypeInfo(fileType);

        if (fileType === fileTypes[EEIMP]){
            this.setState({
                dropCss: '',
                lblCss:'showing',
                eeCss: show,
                optSelCanIEW: optSelCanIEW,
                optSelConI: optSelConI,
                unpopulated: true,
                disableCustMap:true,
                mtCss: noShow
            });
            return;
        }

        allMappings = allMappings.filter(function(item){
            return !!item.mappingName;
        });
        this.allMappings = allMappings;

        availableMappings = availableMappings.filter(function(item){
            return !!item.mappingName;
        });

        this.allGenMappings = allMappings.filter(function(item) {
            return !!item.docUrl;
        });

        this.availableMappings = availableMappings;

        var drop = this.refs.drop,
            dropItems = MapFuncs.getDropItems(availableMappings);
        this.populateDropdown(drop, dropItems);

        if (this.isMultiTab) {
            multiTabInfo = getMultiTabInfo();
            resetMultiTab = false;

            this.setState({
                disableCustMap: true,
                multiTabInfo: multiTabInfo,
                mtCss: show,
                dropCss: '',
                resetMultiTab: resetMultiTab
            });
            return;
        }

        if(isCustomMap) {
            setFileData(this.file, this.fileType, dropItems, this.availableMappings, this.selectedMappings);
            setCustMapInfo(isEdit, null, emptyString, this.allGenMappings);
            this.getDynamicCols();
            return;
        }

        if (availableMappings.length === 1){
            this.selectedMappings = null;
            this.onOneMappingMatch(availableMappings);
        } else {
            this.setState({
                dropCss: 'showing',
                lblCss:'',
                eeCss: noShow,
                optSelCanIEW: optSelCanIEW,
                optSelConI: optSelConI,
                unpopulated: true,
                disableCustMap:false,
                mtCss: noShow
            });
        }
    }

    onValidatePost(result) {
        var errObj, errorMsg;
        if ((result !== undefined) && (result !== null)) {
            if (result.status !== 1) {
                errorMsg = result.message;
                errObj = { title: 'Validation Error', message: errorMsg };
                errorDialog(errObj);
            } else {
                isEdit = true;
                setCustMapInfo(isEdit, this.selectedMappings, result.message, this.allGenMappings);
                setFileData(this.file, this.fileType, null, null, this.selectedMappings);
                this.gotoMapColumns();
            }
        }
    }

    onImportOption() {
        var
            rbtnEeImpCanIew = this.refs.eeImportOptCanIEW,
            rbtnEeImpConI = this.refs.eeImportOptConI,
            optVal = 0;
        if (rbtnEeImpCanIew.checked) {
            optVal = 1;
            optSelCanIEW = true;
            optSelConI = false;
        } else if (rbtnEeImpConI.checked) {
            optVal = 2;
            optSelCanIEW = false;
            optSelConI = true;
        }
        eeImportSelOpt = eeImportOptValues[optVal];
        if (optVal > 0) {
            setEEImpSelOption(eeImportSelOpt);
            this.setState({
                unpopulated: false,
                optSelCanIEW: optSelCanIEW,
                optSelConI: optSelConI
            });
        }
    }

    populateDropdown(drop, dropItems){
        MapFuncs.populateDropdown(drop, dropItems);
        this.selectedMappings = null;
    }

    onOneMappingMatch(availableMappings){
        var mapName = availableMappings[0].mappingName,
            id = availableMappings[0].id;

        importTypeFullInfo = importTypeInfo + mapName;
        this.refs.lblfileinfo.innerHTML = importTypeFullInfo;

        this.selectedMappings = MapFuncs.getSelectedMappings(id, availableMappings);

        if (this.selectedMappings) {
            this.setState({
                dropCss:'',
                lblCss:'showing',
                eeCss: noShow,
                optSelCanIEW: optSelCanIEW,
                optSelConI: optSelConI,
                unpopulated:false,
                disableCustMap:false,
                mtCss: noShow
            });
        }
    }

    replaceEmptywithHtmlNonBreakSpace(sampleDataArray, numberofColumns) {
        var i,j;
        for(i = 0; i < sampleDataArray.length; i++){
            for(j = 0; j < numberofColumns; j++){
                if (sampleDataArray[i][j] === emptyString){
                    sampleDataArray[i][j] = emptyString;
                }
            };
        }
    }

    generateNoMatchColumnsData(numberofColumns, sampleData, dataDelimiter) {
        var colData = [numberofColumns];

        for (var j = 0; j < numberofColumns; j++) {
            colData[j] = [];
        }

        var sampleDataArray = [];
        for (var k =0; k < sampleData.length; k++)	{
            sampleDataArray[k] = sampleData[k][0].split(dataDelimiter);
        }

        this.replaceEmptywithHtmlNonBreakSpace(sampleDataArray, numberofColumns);

        for (var i = 0; i < numberofColumns; i++) {
            colData[i] = {
                id:i,
                fielddef: [{label: emptyString, value: emptyString, req: null}],
                columnref: 'Column ' + ComnFuncs.numToAlpha(i),
                header: noColHdrTxt,
                row0: sampleDataArray[0][i],
                row1: sampleDataArray[0][i],
                row2: sampleDataArray[1][i],
                row3: sampleDataArray[2][i],
                row4: sampleDataArray[3][i]
            }
        }
        return colData;
    }

    getDynamicCols(){
        var dynColArray = this.generateNoMatchColumnsData(this.columnCount, JSON.parse(getSampleData()), delimComma);
        setDynamicColArray(JSON.stringify(dynColArray));
        location.hash = mapColumnLink;
        return;
    }

    showDrop(){
        this.setState({
            dropCss: 'showing'
        });
    }

    hideDrop(){
        this.setState({
            dropCss: ''
        });
    }

    gotoMapColumns() {
        this.saveRedirectInfo();
        this.getDynamicCols();
        location.hash = mapColumnLink;
    }

    setStateOnNoSelect() {
        this.setState({
            dropCss:emptyString,
            lblCss: emptyString,
            eeCss: noShow,
            optSelCanIEW: optSelCanIEW,
            optSelConI: optSelConI,
            unpopulated:true,
            disableCustMap:true,
            mtCss: noShow
        });
    }

    resetImportOptions() {
        optSelCanIEW = false,
            optSelConI = false;
    }

    saveRedirectInfo() {
        var curUrl = window.location.href,
            redirectUrl = ComnFuncs.getRedirectUrlFromQueryString();
        setRedirectInfo(curUrl, redirectUrl);
    }

    onChange(data, isUpload) {
        selMultiTabInfo = getSelectedMultiTabInfo();
        this.setState({
            unpopulated: !isUpload,
            selMultiTabInfo: selMultiTabInfo
        });
    }

    resetMultiTabInfo() {
        isMultiTab = false;
        multiTabInfo = null;
        selMultiTabInfo = null;
        resetMultiTab = true;
    }

    render() {
        // JSX
        var self = this;

        var userQues = 'If errors and/or warnings are found while this file is being processed, how would you like the import to proceed?',
            eeQCss = ('calibri-font font-14 black-font'),
            lblfCss = ('orange bold ') + self.state.lblCss,
            lbldCss = ('orange bold ') + self.state.dropCss,
            eeImpCss = ('align-center show') + self.state.eeCss,
            eeOptCss = ('align-center'),
            mTabCss = ('show') + self.state.mtCss,
            noTabCss = ('show') + self.state.dropCss,
            importTemp = 'Download a template to get your data organized for import.';

        return (
            <div data-test-id="import" className="page import">
            <section>
            <ay-dnd-upload data-test-id="file-dnd" accept="txt,csv,xlsx" ref="dnd" class={this.state.dndCss}></ay-dnd-upload>
        </section>
        <section>
        <h3>Import Types</h3>
        <section className= {lblfCss}>
            <label data-test-id="lbl-fileinfo" ref="lblfileinfo" className={lblfCss}></label>
            <section className={eeImpCss}>
            {userQues}
            <br/>
            <input type="radio" value="CANW" name="eeImportOpt" ref="eeImportOptCanIEW" data-test-id="rbtn-can-iw"
        checked ={self.state.optSelCanIEW} className={eeOptCss} onClick={self.onImportOption.bind(self)}/>Cancel import and download errors and warnings report (Excel/PDF)
        <br/>
        <input type="radio" value="CONT" name="eeImportOpt"  ref="eeImportOptConI" data-test-id="rbtn-con-i"
        checked ={self.state.optSelConI} className={eeOptCss} onClick={self.onImportOption.bind(self)}/>Continue import of valid rows and download report (Excel/PDF)
        </section>
        </section>
        <section className= {noTabCss}>
            <label data-test-id="lbl-drop" ref="lbldrop" className={lbldCss}>Select an Import Type:</label>
        <ay-drop-down data-test-id="drop-down" placeholder="Select One..." ref="drop" class= {this.state.dropCss}></ay-drop-down>
        </section>
        <section className={mTabCss}>
            <MultiTabs data-test-id="multiTabs" ref="multiTabs" data={self.state.multiTabInfo} selData = {self.state.selMultiTabInfo}
        onTabChange={self.onChange.bind(self)} reset = {self.state.resetMultiTab} />
    </section>
        <div className="ay-button-row">
            <button data-test-id="btn-custmap" className="ay-btn blue ay-icon-ok" ref="custmap" disabled={this.state.disableCustMap}
        onClick={this.onCustMapClick.bind(this)}>Custom Map</button>
        <button data-test-id="btn-upload" className="ay-btn blue ay-icon-ok" ref="ok" disabled={this.state.unpopulated}
        onClick={this.onUploadClick.bind(this)}>Upload</button>
        </div>
        </section>
        <section>
        <h3>Import Templates</h3>
        {importTemp}
        <br/>
        <br/>
        <div>
        <ay-drop-down data-test-id="drop-down-imp-temp" placeholder="Select One..." ref="dropImportTemplate" class= {this.state.templateDropCss}></ay-drop-down>
        <button data-test-id="btn-download" className="ay-btn blue ay-icon-download ay-btn-enable ay-btn-margin " ref="download" disabled={this.state.disableDownloadTemp}
        onClick={this.onDownloadTmplClick.bind(this)}>Download</button>
        </div>
        </section>
        <br/>
        <HistoryTable data-test-id="history" ref="history" />
            </div>
    );
    }
}