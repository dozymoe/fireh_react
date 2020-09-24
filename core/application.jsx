import { createBrowserHistory } from 'history';
import { find, isFunction, matches, merge } from 'lodash';
import { observable } from 'mobx';
import { Provider } from 'mobx-react';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';


class ApplicationStorage {
    @observable user;
    components = [];

    // Override this with your own.
    route(name, params, query, options)
    {
        return '/';
    }

    // Override this with your own
    alert(message, options)
    {
        window.alert(message);
    }

    renderComponent(model, view, props)
    {
        let meta = find(this.components, matches({model: model, view: view}));
        return meta ? <meta.component {...props}/> : null;
    }
}


export function create_application(props)
{
    const app = new ApplicationStorage();
    merge(app, props);

    // Initialize singletons
    app.history = createBrowserHistory();

    return app;
}


export function run(app, components, routes, element)
{
    if (element && routes && routes.length)
    {
        ReactDOM.render(
            <Router history={app.history}>
              <Provider app={app}>
                <Switch>
                  {routes.map((item, idx) => <Route key={idx} path={item.path}
                      component={item.component}/>)}
                </Switch>
              </Provider>
            </Router>,
    
            element
        );
    }
    components.forEach(function(item)
    {
        if (item.selector)
        {
            document.querySelectorAll(item.selector).forEach(function(element)
            {
                if (isFunction(item.component))
                {
                    item.component(app, element);
                }
                else
                {
                    let Component = item.component;
                    ReactDOM.render(
                        <Provider app={app}>
                          <Component/>
                        </Provider>,

                        element);
                }
            });
        }
        else
        {
            app.components.push(item);
        }
    });
}
