/*
   Xpress Insight vdlx-datagrid
   =============================

   file vdlx-datagrid/utils.js
   ```````````````````````
   vdlx-datagrid utils.

    (c) Copyright 2022 Fair Isaac Corporation

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
import {CUSTOM_COLUMN_DEFINITION, EDITOR_TYPES} from "../../constants";
import {chooseColumnFilter} from "../grid-filters";
import {
    createBasicColumnDefinition,
    createValueTypedColumnProperties,
    removePropsNotInApprovedList
} from './custom-column-utils';
import {convertCustomDataToObjectData, convertObjectDataToLabelData} from './custom-data-utils';
import {
    checkboxFilterFunc,
    FILTER_PLACEHOLDER_TEXT,
    getHeaderFilterEmptyCheckFn,
    getHeaderFilterParams
} from '../column-filter-utils';
import assign from "lodash/assign";
import filter from 'lodash/filter';
import isFunction from "lodash/isFunction";
import values from "lodash/values";
import parseInt from "lodash/parseInt";
import size from "lodash/size";
import map from "lodash/map";
import head from "lodash/head";
import get from "lodash/get";

/**
 * creates config object containing data and columns
 * @param gridOptions
 * @returns {{data: (*|[]), columns: (*|*[])}}
 */
export const createCustomConfig = (gridOptions) => {

    // todo - fix issue of the filters are not cleared out when the data changes
    // todo - fix issue of filters not working with user defined columns

    const data = gridOptions.data();

    if (!size(data)) {
        return {
            columns: [],
            data: []
        };
    }

    let datagridData = [];
    let columnDefinitions = [];

    switch (gridOptions.columnDefinitionType) {
        case CUSTOM_COLUMN_DEFINITION.AUTO:
            datagridData = convertCustomDataToObjectData(data);
            columnDefinitions = createAutoColumnDefinitions(head(datagridData));
            break
        case CUSTOM_COLUMN_DEFINITION.OBJECT:
            datagridData = data;
            columnDefinitions = createColumnsFromUserDefinition(gridOptions.columnDefinitions(), head(data));
            break
        case CUSTOM_COLUMN_DEFINITION.LABELS:
            datagridData = convertObjectDataToLabelData(data);
            columnDefinitions = createColumnsFromLabels(data);
            break
        default:
            console.error('Error for component vdlx-datagrid: unrecognised column format.');
    }

    // todo - should this be in datagrid.setCustomDataColumnsAndData
    // apply rowFilter from attr
    const rowFilter = gridOptions.rowFilter;
    if (isFunction(rowFilter)) {
        datagridData = applyRowFilter(datagridData, rowFilter);
    }

    return {
        columns: addGridOptionsProps(gridOptions, columnDefinitions),
        data: datagridData
    };

};

/**
 * trigger the rowFilter call back set in the attrs
 * @param data
 * @param rowFilter
 * @returns {*}
 */
export const applyRowFilter = (data, rowFilter) => {
    return filter(data, (rowData) => {
        return rowFilter(values(rowData));
    });
}

export const createAutoColumnDefinitions = (data) => {
    return map(data, (val, key) => createBasicColumnDefinition(key, val));
};

/**
 * take the user defined column configurations and add the required value type attributes, and delete undesired props
 * @param colDefinitions
 * @param data
 * @returns {*}
 */
export const createColumnsFromUserDefinition = (colDefinitions, data) => {
    // pick the data attr by using the col definition field attr
    return map(colDefinitions, (col) => {
        const colValue = get(data, col.field, '');
        return {
            ...removePropsNotInApprovedList(col),
            ...createValueTypedColumnProperties(colValue)
        }
    });
}

export const createColumnsFromLabels = (data) => {
    return map(data, (row, index) => {
        const id = index.toString();
        return {
            id: id,
            title: row.label,
            field: id,
            ...createValueTypedColumnProperties(row.value)
        };
    });
};

/**
 * add all properties set via the vdlx-datagrid attributes
 * @param gridOptions
 * @param columns
 * @returns {*}
 */
const addGridOptionsProps = (gridOptions, columns) => {

    const freezeColumns = parseInt(gridOptions.freezeColumns);
    const includeFilter = gridOptions.columnFilter || false;

    return map(columns, (col, index) => {
        // custom data does not support editable columns
        let column = {
            ...col,
            editable: false
        };
        if (index < freezeColumns) {
            assign(column, {frozen: true});
        }
        if (includeFilter) {
            assign(column, configureColumnFilter(col));
        }

        return column;
    });

};


/**
 * configure a column filter for a column
 * @returns {*}
 * @param col
 */
export const configureColumnFilter = (col) => {

    const getHeaderFilter = () => {
        if (col.editor === EDITOR_TYPES.checkbox) {
            return EDITOR_TYPES.select;
        }
        return true;
    };

    const getHeaderFilterFn = (column) => {

        if (column.editor === EDITOR_TYPES.checkbox) {
            return checkboxFilterFunc;
        }

        const columnFilter = chooseColumnFilter(column);
        if (columnFilter) {
            return (valueTxt, cellValue, rowData, params) => {
                return columnFilter(valueTxt, cellValue, rowData, params);
            };
        }
        return undefined;
    };

    const headerFilterParams = getHeaderFilterParams(col);
    const headerFilterEmptyCheck = getHeaderFilterEmptyCheckFn(col, headerFilterParams);

    let filterConfig = {
        headerFilterParams: headerFilterParams,
        headerFilterPlaceholder: FILTER_PLACEHOLDER_TEXT,
        headerFilter: getHeaderFilter(),
        headerFilterFunc: getHeaderFilterFn(col),
        headerFilterEmptyCheck: headerFilterEmptyCheck,
    };
    return assign(col, filterConfig);
};
