sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], (Controller, JSONModel, MessageBox, MessageToast) => {
    "use strict";

    return Controller.extend("excelutil.controller.Index", {
        onInit: function () {
            this._oFileData = null;

            // Initialize local JSON model to hold table data
            var oLocalModel = new JSONModel({
                students: [] // Initial empty array
            });
            this.getView().setModel(oLocalModel, "localData");
        },

        onFileChange: function (oEvent) {
            var oFile = oEvent.getParameter("files")[0];
            var oUploadBtn = this.byId("uploadBtn");

            if (!oFile) {
                this._oFileData = null;
                oUploadBtn.setEnabled(false);
                return;
            }

            this._oFileData = {
                Filename: oFile.name,
                MimeType: oFile.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            };
            oUploadBtn.setEnabled(true);
        },

        onUploadPress: function () {
            var oFileUploader = this.byId("fileUploader");
            var oDomRef = oFileUploader.getFocusDomRef();
            var oFile = oDomRef.files[0];

            if (!oFile) {
                MessageBox.error("Please select a file first.");
                return;
            }

            sap.ui.core.BusyIndicator.show(0);

            var oReader = new FileReader();
            oReader.onload = function (e) {
                var sResult = e.target.result;
                var sBase64Content = sResult.split(",")[1];

                var oPayload = {
                    "FileContent": sBase64Content,
                    "MimeType": this._oFileData.MimeType,
                    "Filename": this._oFileData.Filename
                };
                this.onTriggerStaticAction(oPayload);
                // this._sendPayloadToRAP(oPayload);
            }.bind(this);

            oReader.onerror = function () {
                sap.ui.core.BusyIndicator.hide();
                MessageBox.error("Error reading the Excel file.");
            };

            oReader.readAsDataURL(oFile);
        },

        _sendPayloadToRAP: function (oPayload) {
            var oModel = this.getView().getModel();
            var sServiceUrl = oModel.getServiceUrl();
            var sActionUrl = sServiceUrl + "ZCE_EXCEL_UTIL/SAP__self.ConvertExcelData";
            var sCsrfToken = oModel.getHttpHeaders()["X-CSRF-Token"];
            if (!sCsrfToken && oModel.getSecurityToken) {
                sCsrfToken = oModel.getSecurityToken();
            }
            var oHeaders = Object.assign({}, oModel.getHttpHeaders(), {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-CSRF-Token": sCsrfToken
            });

            fetch(sActionUrl, {
                method: "POST",
                headers: oHeaders,
                body: JSON.stringify(oPayload)
            })
                .then(function (oResponse) {
                    if (!oResponse.ok) {
                        throw new Error("HTTP error! Status: " + oResponse.status);
                    }
                    return oResponse.json();
                })
                .then(function (oResultData) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("File processed successfully!");

                    // Direct response mapping to table
                    this._updateLocalTableData(oResultData);
                }.bind(this))
                .catch(function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Payload execution failed: " + oError.message);
                });
        },

        /**
         * Updates the local JSON model with data received from RAP response payload
         */
        _updateLocalTableData: function (oData) {
            var oLocalModel = this.getView().getModel("localData");

            // OData v4 response collections are wrapped inside a 'value' property
            if (oData && oData.value) {
                // Set the array to our local model property path
                oLocalModel.setProperty("/students", oData.value);
            } else {
                // Clear the table data if response payload structure is unexpected or empty
                oLocalModel.setProperty("/students", []);
                MessageToast.show("No student records returned from backend.");
            }
        },
        onTriggerStaticAction: function (oPayload) {
            // 1. Retrieve the OData V4 Model
            // (Assumes the V4 model is set as the default model in the manifest)
            const oModel = this.getView().getModel();

            // 2. Define the Action Path 
            // *Replace with your exact Entity Set, Namespace, and Action Name*
            const sActionPath = "/ZCE_EXCEL_UTIL/com.sap.gateway.srvd_a2x.zsd_excel_util.v0001.ConvertExcelData(...)";

            // 3. Create the Context Binding for the Operation
            const oActionBinding = oModel.bindContext(sActionPath);

            const sBase64FileContent = ""; // Your base64 string
            const sMimeType = "application/pdf";
            const sFilename = "TestDocument.pdf";

            // 4. Set the Parameters matching your payload structure
            // oActionBinding.setParameter("FileContent", sBase64FileContent);
            // oActionBinding.setParameter("MimeType", sMimeType);
            // oActionBinding.setParameter("Filename", sFilename);
            for (var sKey in oPayload) {
                if (oPayload.hasOwnProperty(sKey)) {
                    oActionBinding.setParameter(sKey, oPayload[sKey]);
                }
            }

            // 5. Execute the Action asynchronously
            oActionBinding.execute().then(function () {
                // Success Callback
                MessageToast.show("Static action executed successfully!");
                sap.ui.core.BusyIndicator.hide();
                // If your action returns data, you can retrieve it like this:
                const oResponseData = oActionBinding.getBoundContext().getObject();
                debugger; // Set a breakpoint here to inspect the response data
                this._updateLocalTableData(oResponseData); // Update the table with the response data

                // Optional: Refresh your table/list if the action modified backend data
                // this.byId("myTable").getBinding("items").refresh();

            }.bind(this)).catch(function (oError) {
                // Error Callback
                sap.ui.core.BusyIndicator.hide();
                MessageBox.error("Action failed: " + oError.message);
            });
        }
    });
});