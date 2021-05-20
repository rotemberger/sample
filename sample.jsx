// core
import React, { useEffect, useState } from 'react';

// material ui
import {
    makeStyles,
    Box,
    Divider,
    Grid,
    TextField,
    Typography,
} from '@material-ui/core';

// 3rd pary
import { Form, Formik } from 'formik';

// services
import {
    validateIPAddress,
    validatePort,
} from 'services/Network';

// consts
import { POLLING_INTERVAL } from 'store/consts/AJAX';

// actions
import { fetchAssetAlertsRequested } from 'store/actions/alerts/Alerts';

import { resetAjaxTracker } from 'store/actions/AjaxTracker';

import {
    createAssetsRequested,
    fetchAssetRequested,
    fetchAssetsRequested,
    updateAssetsRequested,
    CREATE_ASSET_REQUESTED,
    UPDATE_ASSET_REQUESTED,
} from 'store/actions/Assets';

import { fetchGroupsRequested } from 'store/actions/Groups';

// selectors
import GetAsset from 'store/selectors/assets/GetAsset';
import GetAssetOptions from 'store/selectors/assets/GetAssetOptions';
import GetDefaultLocation from 'store/selectors/locations/GetDefaultLocation';
import GetDeviceOptions from 'store/selectors/devices/GetDeviceOptions';
import GetEdgeOptions from 'store/selectors/edges/GetEdgeOptions';
import GetCustomGroupsOptions from 'store/selectors/groups/GetCustomGroupsOptions';

// enhencers
import composeContainer from 'app/compose';

// components
import CustomAutocomplete from 'app/ui-components/CustomAutocomplete';
import OutlinedWrap from 'app/ui-components/OutlinedWrap';
import SaveResetModalFooter from 'app/ui-components/SaveResetModalFooter';
import SelectMap from 'app/ui-components/SelectMap';
import StickyFormConfirm from 'app/ui-components/StickyFormConfirm';

import AssetStatusIcon from 'app/components/assets/AssetStatusIcon';

const useStyles = makeStyles((theme) => ({
    controlsWrap: {
        justifyContent: 'space-between',
    },
    root: {
        '& hr': {
            margin: theme.spacing(0, 2),
        },
        flexWrap: 'nowrap',
    },
    grow: {
        flexGrow: 1,
    },
}));

function AssetEditor({
    // api props
    asset,
    error,
    externalConfirm,
    // redux state
    assetOptions,
    defaultLocation,
    deviceOptions,
    edgeOptions,
    groupOptions,
    // redux actions
    createAssetDispatcher,
    fetchAssetDispatcher,
    fetchAssetsDispatcher,
    fetchGroupsDispatcher,
    resetAjaxTrackerDispatcher,
    updateAssetDispatcher,
    // injections
    t,
}) {
    const classes = useStyles();

    const [mapCenter, setMapCenter] = useState(null);

    const initialValues = {
        address: '',
        deviceTypeIdSelection: null,
        edgeIdSelection: null,
        locationName: null,
        locationLatLng: null,
        name: '',
        port: '',
        groupIdsSelection: [],
        uplinkAssetIdSelection: null,
    };

    const currentValues = { ...initialValues };

    let currentDeviceTypeIdSelection = null;
    let currentEdgeIdSelection = null;
    let currentGroupIdsSelection = null;
    let currentUplinkAssetIdSelection = null;
    let modalActionString;

    function validate(values) {
        const errors = {};
        if (!values.name) {
            errors.name = t('mandatory');
        }

        if (values.address) {
            if (!validateIPAddress(values.address)) {
                errors.address = t('invalidIP');
            }
        } else {
            errors.address = t('mandatory');
        }

        if (values.port) {
            if (!validatePort(values.port)) {
                errors.port = t('invalidPort');
            }
        } else {
            errors.port = t('mandatory');
        }

        if (!values.deviceTypeIdSelection) {
            errors.deviceTypeIdSelection = t('mandatory');
        }

        return errors;
    }

    function onSubmit(values, { setSubmitting, resetForm }) {
        const resultAsset = {
            ...asset,
            address: values.address,
            deviceTypeId: values.deviceTypeIdSelection && values.deviceTypeIdSelection.id,
            edgeId: values.edgeIdSelection && values.edgeIdSelection.id,
            groupIds: values.groupIdsSelection.map((selection) => selection.id),
            locationName: values.locationName,
            name: values.name,
            port: values.port,
            uplinkAssetId: values.uplinkAssetIdSelection && values.uplinkAssetIdSelection.id,
        };

        if (values.locationLatLng) {
            resultAsset.geo = {
                type: 'Point',
                coordinates: [
                    values.locationLatLng[0],
                    values.locationLatLng[1],
                ],
            };
        }

        if (resultAsset._id) {
            updateAssetDispatcher(resultAsset);
        } else {
            createAssetDispatcher(resultAsset);
        }
        setSubmitting(false);
        resetForm({ values });
    }

    // component did moount listener
    useEffect(() => {
        const interval = setInterval(() => {
            fetchAssetsDispatcher();
            fetchGroupsDispatcher();
        }, POLLING_INTERVAL);

        fetchAssetsDispatcher();
        fetchGroupsDispatcher();

        return function cleanup() {
            clearInterval(interval);
            resetAjaxTrackerDispatcher(CREATE_ASSET_REQUESTED);
            resetAjaxTrackerDispatcher(UPDATE_ASSET_REQUESTED);
        };
    }, []);

    // assetId listener

    if (asset) {
        modalActionString = t('updateItem', { item: t('asset') });

        currentValues.name = asset.name;
        currentValues.address = asset.address;
        currentValues.port = asset.port;

        // set device type if exists
        currentDeviceTypeIdSelection = deviceOptions.find((deviceOption) => `${deviceOption.id}` === `${asset.deviceTypeId}`);

        if (currentDeviceTypeIdSelection) {
            currentValues.deviceTypeIdSelection = currentDeviceTypeIdSelection;
        }

        // set edge if exists
        currentEdgeIdSelection = edgeOptions.find((edgeOption) => `${edgeOption.id}` === `${asset.edgeId}`);

        if (currentEdgeIdSelection) {
            currentValues.edgeIdSelection = currentEdgeIdSelection;
        }

        // set uplink asset if exists
        currentUplinkAssetIdSelection = assetOptions.find((uplinkAssetIdOption) => `${uplinkAssetIdOption.id}` === `${asset.uplinkAssetId}`);

        if (currentUplinkAssetIdSelection) {
            currentValues.uplinkAssetIdSelection = currentUplinkAssetIdSelection;
        }

        // set groups if exists
        if (asset.groupIds) {
            currentGroupIdsSelection = groupOptions.reduce((acc, currentGroupIdOption) => {
                if (asset.groupIds.includes(currentGroupIdOption.id)) {
                    acc.push(currentGroupIdOption);
                }
                return acc;
            }, []);

            if (currentGroupIdsSelection) {
                currentValues.groupIdsSelection = currentGroupIdsSelection;
            }
        }

        currentValues.locationName = asset.locationName;

        if (asset.geo) {
            currentValues.locationLatLng = [...asset.geo.coordinates];
            if (mapCenter === null) {
                setMapCenter(currentValues.locationLatLng);
            }
        } else {
            currentValues.locationLatLng = [...defaultLocation];
        }
    } else {
        modalActionString = t('createItem', { item: t('asset') });
        currentValues.locationLatLng = [...defaultLocation];
    }

    // render
    return (
        <Formik
            initialValues={currentValues}
            enableReinitialize
            validate={validate}
            onSubmit={onSubmit}
        >
            {({
                dirty,
                errors,
                resetForm,
                setFieldValue,
                submitForm,
                touched,
                values,
            }) => (
                <Form>
                    {!externalConfirm && <Typography>{modalActionString}</Typography>}

                    <Grid container className={classes.root}>
                        <Grid item className={classes.grow}>
                            <Box mt={2}>
                                <Grid container className={classes.grow} spacing={2}>
                                    <Grid item className={classes.grow}>
                                        <CustomAutocomplete
                                            required
                                            label={t('deviceType')}
                                            value={values.deviceTypeIdSelection}
                                            onChange={(selectedItem) => {
                                                setFieldValue('deviceTypeIdSelection', selectedItem);
                                            }}
                                            options={deviceOptions}
                                            error={touched.deviceTypeIdSelection && Boolean(errors.deviceTypeIdSelection)}
                                            helperText={touched.deviceTypeIdSelection && errors.deviceTypeIdSelection}
                                        />
                                    </Grid>
                                    {asset && asset._id && (
                                        <Grid item xs={3}>
                                            <OutlinedWrap title={t('assetStatus')}>
                                                <AssetStatusIcon
                                                    value={asset && asset.status}
                                                    verbose
                                                />
                                            </OutlinedWrap>
                                        </Grid>
                                    )}

                                </Grid>

                            </Box>

                            <Box mt={3}>
                                <TextField
                                    required
                                    error={touched.name && Boolean(errors.name)}
                                    helperText={touched.name ? errors.name : ''}
                                    value={values.name}
                                    onChange={(e) => setFieldValue('name', e.target.value)}
                                    fullWidth
                                    placeholder={t('name')}
                                    variant="outlined"
                                    label={t('name')}
                                />
                            </Box>

                            <Box mt={3}>
                                <Grid container className={classes.grow} spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            className={classes.grow}
                                            required
                                            error={touched.address && Boolean(errors.address)}
                                            helperText={touched.address ? errors.address : ''}
                                            value={values.address}
                                            onChange={(e) => setFieldValue('address', e.target.value)}
                                            placeholder={t('networkAddress')}
                                            variant="outlined"
                                            label={t('networkAddress')}
                                            fullWidth
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            className={classes.grow}
                                            required
                                            error={touched.port && !!errors.port}
                                            helperText={touched.port ? errors.port : ''}
                                            value={values.port}
                                            type="number"
                                            onChange={(e) => setFieldValue('port', e.target.value)}
                                            placeholder={t('port')}
                                            variant="outlined"
                                            label={t('port')}
                                            fullWidth
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            <Box mt={2}>
                                <Grid container spacing={2}>
                                    <Grid
                                        item
                                        className={classes.grow}
                                    >
                                        <CustomAutocomplete
                                            label={t('edge')}
                                            value={values.edgeIdSelection}
                                            onChange={(selectedItem) => {
                                                setFieldValue('edgeIdSelection', selectedItem);
                                            }}
                                            options={edgeOptions}
                                            error={touched.edgeIdSelection && Boolean(errors.edgeIdSelection)}
                                            helperText={touched.edgeIdSelection && errors.edgeIdSelection}
                                        />
                                    </Grid>

                                    <Grid
                                        item
                                        className={classes.grow}
                                    >
                                        <CustomAutocomplete
                                            label={t('uplinkAsset')}
                                            value={values.uplinkAssetIdSelection}
                                            onChange={(selectedItem) => {
                                                setFieldValue('uplinkAssetIdSelection', selectedItem);
                                            }}
                                            options={assetOptions.filter((assetItr) => !(asset && asset._id && asset._id.$oid === assetItr.id))}
                                            error={touched.uplinkAssetIdSelection && Boolean(errors.uplinkAssetIdSelection)}
                                            helperText={touched.uplinkAssetIdSelection && errors.uplinkAssetIdSelection}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            <Box mt={3}>
                                <CustomAutocomplete
                                    required
                                    multiple
                                    label={t('assetsGroups')}
                                    value={values.groupIdsSelection}
                                    onChange={(selectedItem) => {
                                        setFieldValue('groupIdsSelection', selectedItem);
                                    }}
                                    options={groupOptions}
                                    error={touched.groupIds && Boolean(errors.groupIds)}
                                    helperText={touched.groupIds && errors.groupIds}
                                />
                            </Box>
                        </Grid>

                        <Divider orientation="vertical" flexItem />

                        <Grid item xs={5}>
                            <Box pt={2} height="100%">
                                <SelectMap
                                    showFavorites
                                    center={mapCenter}
                                    value={values.locationLatLng}
                                    onCenter={(center) => setMapCenter(center)}
                                    onChange={(address, latLng) => {
                                        setFieldValue('locationLatLng', latLng);
                                        setFieldValue('locationName', address);
                                    }}
                                />
                            </Box>

                        </Grid>
                    </Grid>

                    {!externalConfirm
                        && (
                            <>
                                {error && (
                                    <Box mt={2}>
                                        <Typography color="error">{error}</Typography>
                                    </Box>
                                )}

                                <Box mt={2}>
                                    <SaveResetModalFooter
                                        onReset={() => resetForm()}
                                        onSubmit={() => submitForm()}
                                    />

                                </Box>
                            </>
                        )}

                    {externalConfirm && dirty
                    && (
                        <StickyFormConfirm
                            onConfirm={() => submitForm()}
                            onCancel={() => resetForm()}
                        />
                    ) }
                </Form>
            )}
        </Formik>
    );
}
function mapStateToProps(state) {
    return {
        assetOptions: GetAssetOptions(state),
        deviceOptions: GetDeviceOptions(state),
        edgeOptions: GetEdgeOptions(state),
        groupOptions: GetCustomGroupsOptions(state),
        defaultLocation: GetDefaultLocation(state),
    };
}

function mapActionsToProps(dispatch) {
    return {
        createAssetDispatcher: (asset) => dispatch(createAssetsRequested(asset)),
        fetchAssetAlertsDispatcher: (assetId) => dispatch(fetchAssetAlertsRequested(assetId)),
        fetchAssetDispatcher: (assetId) => dispatch(fetchAssetRequested(assetId)),
        fetchAssetsDispatcher: () => dispatch(fetchAssetsRequested()),
        fetchGroupsDispatcher: () => dispatch(fetchGroupsRequested()),
        updateAssetDispatcher: (asset) => dispatch(updateAssetsRequested(asset)),
        resetAjaxTrackerDispatcher: (trackerId) => dispatch(resetAjaxTracker(trackerId)),
    };
}

export default composeContainer(
    mapStateToProps,
    mapActionsToProps,
)(AssetEditor);
