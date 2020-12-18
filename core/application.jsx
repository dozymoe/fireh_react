import { createBrowserHistory, createHashHistory } from 'history';
import { find, isFunction, matches, merge } from 'lodash';
import { observable } from 'mobx';
import { Provider } from 'mobx-react';
import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Route, Router, Switch } from 'react-router-dom';


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


export function create_application(props, initializations, options)
{
    const app = new ApplicationStorage();
    merge(app, props);
    options = options || {};

    // Initialize singletons
    app.history = options.history === 'hash' ? createHashHistory()
            : createBrowserHistory();

    for (let init of initializations)
    {
        init(app);
    }

    return app;
}


export function run(app, components, routes, element, options)
{
    options = options || {};
    let RouterComponent = options.history === 'hash' ? HashRouter : Router;

    if (element && routes && routes.length)
    {
        ReactDOM.render(
            <RouterComponent history={app.history}>
              <Provider app={app}>
                <Switch>
                  {routes.map((item, idx) => <Route key={idx} path={item.path}
                      component={item.component}/>)}
                </Switch>
              </Provider>
            </RouterComponent>,
    
            element
        );
    }
    for (let c of components)
    {
        if (c.selector)
        {
            for (let el of document.querySelectorAll(c.selector))
            {
                if (isFunction(c.component))
                {
                    c.component(app, el);
                }
                else
                {
                    let Component = c.component;
                    ReactDOM.render(
                            <Provider app={app}>
                              <Component/>
                            </Provider>,

                            el);
                }
            }
        }
        else
        {
            app.components.push(c);
        }
    }
}
