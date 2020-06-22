import ext_expect_expect from "expect.js";
import { templatejs as libutiltemplate_templatejsjs } from "../../lib/util/template";
import ext_fs_fs from "fs";

describe('template: util template methods for templates in lib/templates', function() {
    describe('.render() - Renders a handlebars template', function() {
        var testTemplateName = 'test-template.tpl';
        var testTemplatePath =
            __dirname + '/../../lib/templates/' + testTemplateName;
        beforeEach(function() {
            ext_fs_fs.writeFileSync(testTemplatePath, '{{foo}}');
            console.log();
        });
        it('.render() returns a compiled test-template template', function() {
            var compiledStr = libutiltemplate_templatejsjs.render(testTemplateName, {
                foo: 'foo value'
            });
            ext_expect_expect(compiledStr).to.be.equal('foo value');
        });
        it('.render() throws when a non existent template is provided', function() {
            ext_expect_expect(function() {
                libutiltemplate_templatejsjs.render('test-template.not-present.tpl', {
                    foo: 'foo value'
                });
            }).to.throwException();
        });
        afterEach(function() {
            ext_fs_fs.unlinkSync(testTemplatePath);
        });
    });

    describe('.exists() - Checks existence of a template', function() {
        var testTemplateName = 'test-template.tpl';
        var testTemplatePath =
            __dirname + '/../../lib/templates/' + testTemplateName;
        beforeEach(function() {
            ext_fs_fs.writeFileSync(testTemplatePath, '{{foo}}');
        });
        it('.exists() returns true for an existing template', function() {
            var templateExists = libutiltemplate_templatejsjs.exists(testTemplateName);
            ext_expect_expect(templateExists).to.be.ok();
        });
        it('.exists() returns false for a non existing template', function() {
            var templateExists = libutiltemplate_templatejsjs.exists(
                'test-template.not-present.tpl'
            );
            ext_expect_expect(templateExists).to.not.be.ok();
        });
        afterEach(function() {
            ext_fs_fs.unlinkSync(testTemplatePath);
        });
    });
});
