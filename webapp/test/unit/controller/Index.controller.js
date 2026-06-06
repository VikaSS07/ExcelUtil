/*global QUnit*/

sap.ui.define([
	"excelutil/controller/Index.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Index Controller");

	QUnit.test("I should test the Index controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
