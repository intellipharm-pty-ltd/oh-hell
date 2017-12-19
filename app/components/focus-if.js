export function focusIf($timeout) {
    function link($scope, $element, $attrs) {
        var dom = $element[0];
        if ($attrs.focusIf) {
            $scope.$watch($attrs.focusIf, focus);
        } else {
            focus(true);
        }
        function focus(condition) {
            if (condition) {
                $timeout(function() {
                    dom.focus();
                }, $scope.$eval($attrs.focusDelay) || 0);
            }
        }
    }
    return {
        restrict: 'A',
        link: link
    };
}

focusIf.$inject = ['$timeout'];
