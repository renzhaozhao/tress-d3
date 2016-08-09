angular.module('app', [])

.controller('OneCtrl', function($scope, $http) {
    var duration = 700;
    var viewerWidth = 990;
    var viewerHeight = 720;
    var i = 0;

    var tree = d3.layout.tree()
        .size([viewerHeight, viewerWidth]);

    var diagonal = d3.svg.diagonal()
        .projection(function(d) {
            return [d.y, d.x];
        });

    var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);
    var baseSvg = d3.select('body').append('svg:svg')
        .call(zoomListener);

    var svgGroup = baseSvg.append('svg:g');

    $http.get('www/lib/a.json').success(function(data) {
        $scope.root = data;
        $scope.root.x0 = viewerHeight / 2;
        $scope.root.y0 = 0;

        update($scope.root);
        centerNode($scope.root);
    })

    function centerNode(source) {
        var scale = zoomListener.scale();
        var x = -source.y0;
        var y = -source.x0;
        x = x * scale + viewerWidth / 2;
        y = y * scale + viewerHeight / 2;
        d3.select('g').transition()
            .duration(duration)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
        zoomListener.scale(scale);
        zoomListener.translate([x, y]);
    }

    function zoom() {
        svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    function update(source) {
        var colors = ['#FF6347', '#1E90FF', '#FFD700', '#00CD00', '#FF3E96', '#FF8E6B', '#338E8E', '#68A214'];
        var circleSize = [10, 8, 6, 4];
        var levelWidth = [1];
        var childCount = function(level, n) {

            if (n.children && n.children.length > 0) {
                if (levelWidth.length <= level + 1) levelWidth.push(0);

                levelWidth[level + 1] += n.children.length;
                n.children.forEach(function(d) {
                    childCount(level + 1, d);
                });
            }
        };
        childCount(0, $scope.root);
        var newHeight = d3.max(levelWidth) * 25; // 25 pixels per line
        tree = tree.size([newHeight, viewerWidth]);

        // Compute the new tree layout.
        var nodes = tree.nodes($scope.root).reverse();

        // Normalize for fixed-depth.
        nodes.forEach(function(d) {
            d.y = d.depth * 180;
        });

        // Update the nodes…
        var node = svgGroup.selectAll('g.node')
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append('svg:g')
            .attr('class', 'node')
            .attr('transform', function(d) {
                return 'translate(' + source.y0 + ',' + source.x0 + ')';
            })
            .on('click', function(d) {
                if (d.children || d._children) {
                    toggle(d);
                    update(d);
                    centerNode(d);
                    return;
                }
                var url = ServerUrl + 'industry/chain/temp';
                $http.post(url, {
                    name: d.name,
                    path: d.path
                }).success(function(data) {
                    d.children = data.children;
                    update(d);
                    centerNode(d);
                });

            });

        nodeEnter.append('svg:circle')
            .attr('r', 1e-6)
            .style('fill', function(d) {
                return colors[d.category];
            });

        nodeEnter.append('svg:text')
            .attr('x', function(d) {
                if (d.children && !d._children) {
                    return -10;
                }
                else {
                    return 10;
                }
                //return d.children || d._children ? -10 : 10;
            })
            .attr('dy', '.35em')
            .attr('text-anchor', function(d) {
                if (d.children && !d._children) {
                    return 'end';
                }
                else {
                    return 'start';
                }
                //return d.children || d._children ? 'end' : 'start';
            })
            .text(function(d) {
                return d.name;
            })
            .style('fill-opacity', 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr('transform', function(d) {
                return 'translate(' + d.y + ',' + d.x + ')';
            });

        nodeUpdate.select('circle')
            .attr('r', 6)
            .style('fill', function(d) {
                return colors[d.category];
            });

        nodeUpdate.select('text')
            .style('fill-opacity', 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr('transform', function(d) {
                return 'translate(' + source.y + ',' + source.x + ')';
            })
            .remove();

        nodeExit.select('circle')
            .attr('r', 1e-6);

        nodeExit.select('text')
            .style('fill-opacity', 1e-6);

        // Update the links…
        var link = svgGroup.selectAll('path.link')
            .data(tree.links(nodes), function(d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert('svg:path', 'g')
            .attr('class', 'link')
            .attr('d', function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .transition()
            .duration(duration)
            .attr('d', diagonal);

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr('d', diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr('d', function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Toggle children.
    function toggle(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        }
        else {
            d.children = d._children;
            d._children = null;
        }
    }
})
